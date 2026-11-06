import express from 'express'
import { createServer, request, type Server } from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { UserRecord } from '../../schema/types/User/interfaces'
import type { Knex } from 'knex'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createDatabase } from '../../database'
import { setupClientCertificate } from './index'
import { authenticate, createToken } from '../../schema/types/User/helpers/auth'

let directory: string
let db: Knex
let server: Server
let origin: string
let certificate: string
const secret = 'a'.repeat(64)

beforeEach(async () => {
  vi.stubEnv('VITE_CLIENT_CERT_LOGIN', 'true')
  vi.stubEnv('DATABASE_FILENAME', ':memory:')
  vi.stubEnv('JWT_SECRET', 'certificate-login-test')
  directory = await mkdtemp(join(tmpdir(), 'certificate-login-'))
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      join(directory, 'key'),
      '-out',
      join(directory, 'cert'),
      '-days',
      '1',
      '-subj',
      '/CN=test',
    ],
    { stdio: 'ignore' },
  )
  certificate = await readFile(join(directory, 'cert'), 'utf8')
  await writeFile(
    join(directory, 'authorized-keys.pem'),
    execFileSync('openssl', [
      'x509',
      '-in',
      join(directory, 'cert'),
      '-pubkey',
      '-noout',
    ]),
  )
  await writeFile(join(directory, 'proxy-secret'), secret)
  db = createDatabase()
  const app = express()
  setupClientCertificate(app, db, directory)
  server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Не удалось получить адрес тестового сервера')
  }
  origin = `http://127.0.0.1:${address.port}`
})
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  await db.destroy()
  await rm(directory, { recursive: true, force: true })
  vi.unstubAllEnvs()
})
async function fetch(
  url: string,
  options: {
    headers: Record<string, string>
    redirect?: string
    method?: string
    body?: string
  },
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      { method: options.method, headers: options.headers },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          const headers = new Headers()
          for (const [key, value] of Object.entries(res.headers)) {
            if (value !== undefined) {
              headers.set(key, Array.isArray(value) ? value.join('; ') : value)
            }
          }
          resolve(
            new Response(Buffer.concat(chunks).toString(), {
              status: res.statusCode,
              headers,
            }),
          )
        })
      },
    )
    req.on('error', reject)
    req.end(options.body)
  })
}
async function userToken(id: string, sudo = false): Promise<string> {
  const [user] = await db<UserRecord>('User')
    .insert({ id, sudo })
    .returning('*')
  return createToken(user, db)
}
function post(
  route = 'signin',
  headers: Record<string, string> = {},
  force = false,
) {
  return fetch(origin + '/api/client-certificate/' + route, {
    method: 'POST',
    headers: {
      host: 'site.test',
      origin: 'https://site.test',
      'content-type': 'application/json',
      'x-client-certificate-proxy-secret': secret,
      'x-forwarded-tls-client-cert': certificate.replace(
        /-----[^-]+-----|\s/g,
        '',
      ),
      ...headers,
    },
    body: JSON.stringify({ force }),
  })
}
it('выдаёт JWT первого sudo без пароля и сохраняет текущие права при повторном входе', async () => {
  const response = await post()
  expect(response.status).toBe(200)
  expect(response.headers.get('set-cookie')).toBeNull()
  expect(await authenticate((await response.json()).token, db)).toMatchObject({
    sudo: true,
    username: null,
    password: null,
  })
  await db('User').update({ sudo: false })
  expect(
    await authenticate((await (await post()).json()).token, db),
  ).toMatchObject({ sudo: false })
  expect(await db('User')).toHaveLength(1)
  await db('User').update({ status: 'blocked' })
  expect((await post()).status).toBe(403)
})
it('проверяет источник, сертификат, секрет прокси и список ключей до решения о sudo', async () => {
  await userToken('admin', true)
  for (const headers of [
    { origin: 'https://other.test' },
    { 'x-forwarded-tls-client-cert': '' },
    { 'x-client-certificate-proxy-secret': 'forged' },
    { 'content-type': 'text/plain' },
  ] as Record<string, string>[]) {
    expect((await post('signin', headers, true)).status).toBe(403)
  }
  expect(await (await post()).json()).toEqual({ kind: 'confirm' })
  const denied = await post('signin', {}, true)
  expect(denied.status).toBe(403)
  expect((await denied.json()).message).toContain('Создание второго sudo')
  await writeFile(join(directory, 'authorized-keys.pem'), '')
  const revoked = await post('signin', {}, true)
  expect(revoked.status).toBe(403)
  expect((await revoked.json()).message).toContain('Проверьте')
  expect(await db('User')).toHaveLength(1)
  expect(await db('ClientCertificateAccount')).toHaveLength(0)
  expect(await db('Token')).toHaveLength(1)
})
it('после отказа от создания позволяет привязать ключ; повторная привязка запрещена всем', async () => {
  await userToken('admin', true)
  expect(await (await post()).json()).toEqual({ kind: 'confirm' })
  expect((await post('link')).status).toBe(401)
  const owner = { authorization: 'Bearer ' + (await userToken('owner')) }
  const other = { authorization: 'Bearer ' + (await userToken('other')) }
  const results = await Promise.all([post('link', owner), post('link', owner)])
  expect(results.map((r) => r.status).sort()).toEqual([200, 409])
  expect((await post('link', other)).status).toBe(409)
  expect(await db('ClientCertificateAccount')).toHaveLength(1)
  expect(
    await authenticate((await (await post()).json()).token, db),
  ).toMatchObject({ id: 'owner', sudo: false })
})

it('disables both certificate endpoints even with valid credentials', async () => {
  const token = await userToken('owner')
  vi.stubEnv('VITE_CLIENT_CERT_LOGIN', 'false')
  expect((await post('signin')).status).toBe(404)
  expect(
    (await post('link', { authorization: 'Bearer ' + token })).status,
  ).toBe(404)
  expect(await db('ClientCertificateAccount')).toHaveLength(0)
  expect(await db('Token')).toHaveLength(1)
})
