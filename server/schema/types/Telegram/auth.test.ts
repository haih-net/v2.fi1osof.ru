import { createHash, createHmac } from 'node:crypto'
import type { Knex } from 'knex'
import type { Request } from 'express'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { createDatabase } from '../../../database'
import { authViaTelegram, checkTelegramAuth } from './resolvers/authViaTelegram'
import type { UserRecord } from '../User/interfaces'
import { authenticate } from '../User/helpers/auth'

let db: Knex
const token = 'telegram-test-token'
function signed(auth_date = Math.floor(Date.now() / 1000)) {
  const fields = { id: '1234567890123', auth_date, first_name: 'Test' }
  const text = Object.entries(fields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const hash = createHmac('sha256', createHash('sha256').update(token).digest())
    .update(text)
    .digest('hex')
  return { ...fields, hash }
}
beforeEach(() => {
  db = createDatabase()
  vi.stubEnv('TELEGRAM_BOT_TOKEN', token)
  vi.stubEnv('JWT_SECRET', 'telegram-tests')
})
afterEach(async () => {
  await db.destroy()
  vi.unstubAllEnvs()
})
it('verifies signed fields, excludes invitation metadata and rejects stale or forged payloads', () => {
  expect(checkTelegramAuth({ ...signed(), referrerToken: 'invitation' })).toBe(
    true,
  )
  expect(checkTelegramAuth({ ...signed(), first_name: 'Forged' })).toBe(false)
  expect(checkTelegramAuth(signed(Math.floor(Date.now() / 1000) - 600))).toBe(
    false,
  )
})
it('links an account, issues a session and rejects linking it to another user', async () => {
  const [user, other] = await db<UserRecord>('User')
    .insert([{ id: 'one' }, { id: 'two' }])
    .returning('*')
  const result = await authViaTelegram(signed(), {
    db,
    dbOld: db,
    currentUser: user,
    req: {} as Request,
  })
  expect(await authenticate(result.token ?? '', db)).toMatchObject({
    id: user.id,
  })
  await expect(
    authViaTelegram(signed(), {
      db,
      dbOld: db,
      currentUser: other,
      req: {} as Request,
    }),
  ).rejects.toThrow('другому')
  expect(await db('TelegramAccount')).toHaveLength(1)
})
