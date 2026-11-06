import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { json, type Express, type Request, type Response } from 'express'
import type { Knex } from 'knex'
import { authenticate } from '../../schema/types/User/helpers/auth'
import {
  allowedKey,
  certificateFingerprint,
  completeCertificateAttempt,
} from '../../schema/types/User/helpers/clientCertificate'

const base = '/api/client-certificate'
const denied =
  'Вход по сертификату запрещён. Проверьте, что ваш ключ разрешён на сайте.'
const hash = (value: string) => createHash('sha256').update(value).digest()

async function verifiedKey(
  req: Request,
  directory: string,
): Promise<string | null> {
  const supplied = req.get('x-client-certificate-proxy-secret')
  const leaf = req.get('x-forwarded-tls-client-cert')?.split(',')[0]
  if (!supplied || !leaf || !/^[A-Za-z0-9+/]+={0,2}$/.test(leaf)) {
    return null
  }
  try {
    const secret = (
      await readFile(resolve(directory, 'proxy-secret'), 'utf8')
    ).trim()
    if (secret.length < 64 || !timingSafeEqual(hash(supplied), hash(secret))) {
      return null
    }
    // Traefik передаёт сертификаты DER в base64 через запятую; первым идёт клиентский сертификат.
    const fingerprint = certificateFingerprint(
      `-----BEGIN CERTIFICATE-----\n${leaf}\n-----END CERTIFICATE-----`,
    )
    return (await allowedKey(
      fingerprint,
      resolve(directory, 'authorized-keys.pem'),
    ))
      ? fingerprint
      : null
  } catch {
    return null
  }
}

export function setupClientCertificate(
  app: Express,
  db: Knex,
  directory = resolve('storage/client-certificate'),
): void {
  async function handle(
    req: Request,
    res: Response,
    link: boolean,
  ): Promise<void> {
    res.set('Cache-Control', 'no-store')
    if (process.env.VITE_CLIENT_CERT_LOGIN !== 'true') {
      res.sendStatus(404)
      return
    }
    if (
      !req.is('application/json') ||
      (req.headers.origin &&
        req.headers.origin !== `https://${req.headers.host}`)
    ) {
      res.status(403).json({ message: denied })
      return
    }
    let userId: string | null = null
    if (link) {
      const bearer = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
      const user = bearer ? await authenticate(bearer, db) : null
      if (!user) {
        res
          .status(401)
          .json({ message: 'Для привязки сертификата войдите в профиль.' })
        return
      }
      userId = user.id
    }
    const fingerprint = await verifiedKey(req, directory)
    if (!fingerprint) {
      res.status(403).json({ message: denied })
      return
    }
    const result = await db.transaction(async (trx) => {
      // Получаем блокировку записи до чтения владельца и проверки наличия sudo.
      await trx.raw(
        'UPDATE "ClientCertificateAccount" SET fingerprint = fingerprint WHERE 0',
      )
      return completeCertificateAttempt(
        fingerprint,
        trx,
        userId,
        req.body?.force === true,
      )
    })
    switch (result.kind) {
      case 'denied':
        res.status(403).json({ message: denied })
        return
      case 'conflict':
        res.status(409).json({
          message: 'Сертификат уже привязан. Повторная привязка запрещена.',
        })
        return
      case 'sudoCreationBlocked':
        res.status(403).json({
          message:
            'Создание второго sudo по сертификату временно запрещено. Войдите в существующий аккаунт и привяжите сертификат в профиле.',
        })
        return
      default:
        res.json(result)
    }
  }
  app.post(base + '/signin', json(), (req, res) => handle(req, res, false))
  app.post(base + '/link', json(), (req, res) => handle(req, res, true))
}
