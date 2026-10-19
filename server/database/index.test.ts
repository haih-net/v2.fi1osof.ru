import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import type { Request } from 'express'
import type { Knex } from 'knex'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from './index'
import { schema } from '../schema'
import type { Context } from '../schema/builder'
import { authenticate, hashPassword } from '../schema/types/User/helpers/auth'
import { usersQuery } from '../schema/types/User/helpers/queries'
import type { UserRecord } from '../schema/types/User/interfaces'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')
let db: Knex

beforeEach(() => {
  db = createDatabase()
})
afterEach(async () => {
  await db.destroy()
  vi.unstubAllEnvs()
})

async function query(source: string, currentUser: UserRecord | null = null) {
  const context: Context = {
    db,
    dbOld: db,
    currentUser,
    req: {} as Request,
  }
  const result = await graphql({
    schema,
    source,
    contextValue: context,
  })
  expect(result.errors).toBeUndefined()
  return result.data
}

describe('SQLite integration', () => {
  it('persists records across reopening and restores date and boolean types', async () => {
    const directory = await mkdtemp('server/database/data/test-')
    const filename = join(directory, 'database.sqlite')
    vi.stubEnv('DATABASE_FILENAME', filename)
    const first = createDatabase()
    const date = new Date('2026-10-17T10:20:30.123Z')
    try {
      await first('User').insert({
        id: 'persisted',
        createdAt: date,
        sudo: true,
      })
      await first.destroy()
      const second = createDatabase()
      try {
        const user = await second<UserRecord>('User').first()
        expect(user).toMatchObject({
          id: 'persisted',
          createdAt: date,
          sudo: true,
          isAiAgent: false,
        })
        expect(user?.updatedAt).toBeInstanceOf(Date)
        expect(await second.raw('PRAGMA journal_mode')).toEqual([
          { journal_mode: 'wal' },
        ])
      } finally {
        await second.destroy()
      }
    } finally {
      await first.destroy()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('signs in with a password and validates persisted token dates', async () => {
    vi.stubEnv('JWT_SECRET', 'sqlite-password-test-secret')
    await db('User').insert({
      id: 'owner',
      username: 'owner',
      password: await hashPassword('test-password'),
    })
    const result = await query(
      'mutation { signin(where: {username: "owner"}, data: {password: "test-password"}) {success token} }',
    )
    const payload = result?.signin as { success: boolean; token: string }
    expect(payload.success).toBe(true)
    expect(await authenticate(payload.token, db)).toMatchObject({
      id: 'owner',
      sudo: false,
    })
    await db('Token').update({ expiredAt: new Date(0) })
    expect(await authenticate(payload.token, db)).toBeNull()
  })

  it('supports Unicode case modes, literal string filters and pagination', async () => {
    const [owner] = await db<UserRecord>('User')
      .insert({ id: 'owner', fullname: 'ПРИМЕР_100%', sudo: true })
      .returning('*')
    expect(
      await usersQuery(
        db,
        { fullname: { contains: 'пример', mode: 'insensitive' } },
        null,
      ),
    ).toHaveLength(1)
    expect(
      await usersQuery(db, { fullname: { contains: 'пример' } }, null),
    ).toHaveLength(0)
    expect(
      await usersQuery(
        db,
        { fullname: { startsWith: 'ПРИМЕР_', endsWith: '100%' } },
        null,
      ),
    ).toHaveLength(1)
    expect(
      await usersQuery(
        db,
        { fullname: { not: { contains: 'пример', mode: 'insensitive' } } },
        null,
      ),
    ).toHaveLength(0)
    expect(await query('{ users(take: 0) { id } usersCount }', owner)).toEqual({
      users: [],
      usersCount: 1,
    })
  })

  it('queries concepts by coordinates, literal prefixes, aliases and visibility', async () => {
    await db('User').insert({ id: 'owner' })
    for (const [id, visibility, lat] of [
      ['near', 'public', 55.75],
      ['far', 'hidden', 60],
      ['draft', 'unpublished', 55.75],
    ] as const) {
      await db('KBConcept').insert({
        id,
        name: 'Пример_100%',
        createdById: 'owner',
        visibility,
        lat,
        lng: 37.61,
        data: JSON.stringify({ example: true }),
      })
    }
    await db('SiteRoute').insert({
      id: 'alias',
      path: '/alias',
      kBConceptId: 'near',
    })
    expect(
      await query(
        '{ concepts(where: {name: {startsWith: "Пример_", contains: "ПРИМЕР"}, coords: {lat: 55.75, lng: 37.61}}) {id data uri} kBConceptsCount }',
      ),
    ).toEqual({
      concepts: [{ id: 'near', data: { example: true }, uri: '/alias' }],
      kBConceptsCount: 2,
    })
    expect(await query('{ concept(where: {uri: "/alias"}) {id} }')).toEqual({
      concept: { id: 'near' },
    })
    expect(
      await query('{ concept(where: {uri: "/concepts/far"}) {id uri} }'),
    ).toEqual({ concept: { id: 'far', uri: '/concepts/far' } })
    expect(await query('{ concept(where: {id: "draft"}) {id} }')).toEqual({
      concept: null,
    })
  })

  it('enforces relationships, file deduplication and transaction rollback', async () => {
    await expect(
      db('Token').insert({ id: 'invalid', userId: 'missing' }),
    ).rejects.toThrow('FOREIGN KEY')
    await expect(
      db.transaction(async (trx) => {
        await trx('User').insert({ id: 'rolled-back' })
        throw new Error('rollback')
      }),
    ).rejects.toThrow('rollback')
    expect(await db('User')).toHaveLength(0)
    const file = {
      id: 'first',
      path: 'uploads/first',
      hash: 'same-hash',
      mimetype: 'text/plain',
      encoding: '7bit',
    }
    expect(await db('File').insert(file).returning('*')).toHaveLength(1)
    expect(
      await db('File')
        .insert({ ...file, id: 'second', path: 'uploads/second' })
        .onConflict('hash')
        .ignore()
        .returning('*'),
    ).toHaveLength(0)
  })
})
