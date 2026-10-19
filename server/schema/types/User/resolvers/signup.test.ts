import { createRequire } from 'node:module'
import type { Request } from 'express'
import type { Knex } from 'knex'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createDatabase } from '../../../../database'
import { schema } from '../../../index'
import { authenticate, comparePassword } from '../helpers/auth'
import { signup } from './signup'
import type { UserRecord } from '../interfaces'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')
let db: Knex
const data = { username: 'registered', password: 'Example123' }
beforeEach(() => {
  db = createDatabase()
  vi.stubEnv('JWT_SECRET', 'registration-test-secret')
  vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', 'ANY')
  vi.stubEnv('USER_DEFAULT_STATUS', 'active')
})
afterEach(async () => {
  await db.destroy()
  vi.unstubAllEnvs()
})
it('creates a password account and a usable session, rejects duplicate logins', async () => {
  const ctx = { db, dbOld: db, currentUser: null, req: {} as Request }
  const result = await signup(data, ctx)
  const user = await authenticate(result.token, db)
  expect(user).toMatchObject({
    username: data.username,
    status: 'active',
    sudo: false,
  })
  expect(user?.password).not.toBe(data.password)
  expect(await comparePassword(data.password, user?.password ?? '')).toBe(true)
  await expect(signup(data, ctx)).rejects.toThrow('занят')
  expect(await db('User')).toHaveLength(1)
  expect(await db('Token')).toHaveLength(1)
})
it('requires a valid invitation when registration is restricted and records its owner', async () => {
  const [owner] = await db<UserRecord>('User')
    .insert({ id: 'owner' })
    .returning('*')
  vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', '')
  const ctx = { db, dbOld: db, currentUser: null, req: {} as Request }
  await expect(signup(data, ctx)).rejects.toThrow('приглашения')
  const invitation = await graphql({
    schema,
    source: 'mutation{createReferrerToken}',
    contextValue: { ...ctx, currentUser: owner },
  })
  expect(invitation.errors).toBeUndefined()
  await signup(
    { ...data, referrerToken: String(invitation.data?.createReferrerToken) },
    ctx,
  )
  expect(
    await db('User').where('username', data.username).first(),
  ).toMatchObject({ referrerId: owner.id })
})
it('rejects invalid registration data without writing records', async () => {
  const ctx = { db, dbOld: db, currentUser: null, req: {} as Request }
  await expect(signup({ ...data, password: 'weak' }, ctx)).rejects.toThrow(
    'Пароль',
  )
  await expect(signup({ ...data, username: null }, ctx)).rejects.toThrow(
    'логин',
  )
  expect(await db('User')).toHaveLength(0)
})
