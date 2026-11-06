import {
  createHash,
  createPublicKey,
  randomUUID,
  X509Certificate,
} from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { Knex } from 'knex'
import { createToken } from './auth'
import type { UserRecord } from '../interfaces'

export function keyFingerprint(pem: string): string {
  return createHash('sha256')
    .update(createPublicKey(pem).export({ type: 'spki', format: 'der' }))
    .digest('hex')
}

export async function allowedKey(
  fingerprint: string,
  filename: string,
): Promise<boolean> {
  const keys = await readFile(filename, 'utf8')
  return (
    keys.match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/g) ??
    []
  ).some((key) => keyFingerprint(key) === fingerprint)
}

export function certificateFingerprint(pem: string): string {
  const certificate = new X509Certificate(pem)
  const now = Date.now()
  if (
    Date.parse(certificate.validFrom) > now ||
    Date.parse(certificate.validTo) <= now
  ) {
    throw new Error(
      'Срок действия клиентского сертификата истёк или ещё не наступил',
    )
  }
  return keyFingerprint(
    certificate.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  )
}

export type CertificateResult =
  | { kind: 'signedIn'; token: string }
  | {
      kind: 'linked' | 'conflict' | 'denied' | 'confirm' | 'sudoCreationBlocked'
    }

export async function completeCertificateAttempt(
  fingerprint: string,
  db: Knex,
  linkUserId: string | null,
  force: boolean,
): Promise<CertificateResult> {
  // Вызывать внутри транзакции, которая получила блокировку записи SQLite.
  const account = await db<{ fingerprint: string; userId: string }>(
    'ClientCertificateAccount',
  )
    .where({ fingerprint })
    .first()
  if (linkUserId) {
    const owner = await db<UserRecord>('User').where({ id: linkUserId }).first()
    if (!owner || owner.status === 'blocked') {
      return { kind: 'denied' }
    }
    if (account) {
      return { kind: 'conflict' }
    }
    await db('ClientCertificateAccount').insert({
      fingerprint,
      userId: linkUserId,
    })
    return { kind: 'linked' }
  }
  let user: UserRecord | undefined
  if (account) {
    user = await db<UserRecord>('User').where({ id: account.userId }).first()
  } else {
    if (await db<UserRecord>('User').where({ sudo: true }).first('id')) {
      return { kind: force ? 'sudoCreationBlocked' : 'confirm' }
    }
    ;[user] = await db<UserRecord>('User')
      .insert({
        id: randomUUID(),
        username: null,
        password: null,
        status: 'active',
        sudo: true,
        isAiAgent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning('*')
    await db('ClientCertificateAccount').insert({
      fingerprint,
      userId: user.id,
    })
  }
  if (!user || user.status === 'blocked') {
    return { kind: 'denied' }
  }
  return { kind: 'signedIn', token: await createToken(user, db) }
}
