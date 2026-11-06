import { createRequire } from 'node:module'
import type { Request } from 'express'
import type { Knex } from 'knex'
import { afterEach, expect, it, vi } from 'vitest'
import { createContext } from './context'
import { createDatabase } from './database'
import { schema } from './schema'
import { createToken } from './schema/types/User/helpers/auth'
import type { UserRecord } from './schema/types/User/interfaces'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

afterEach(() => vi.unstubAllEnvs())

it('authenticates SQLite users without legacy access and denies legacy writes even to sudo', async () => {
  vi.stubEnv('JWT_SECRET', 'sqlite-context-test')
  const db = createDatabase()
  const legacy = vi.fn(() => {
    throw new Error('Unexpected legacy database access')
  })
  try {
    const [user] = await db<UserRecord>('User')
      .insert({ id: 'admin', sudo: true })
      .returning('*')
    const token = await createToken(user, db)
    const context = await createContext(
      { headers: { authorization: `Bearer ${token}` } } as Request,
      legacy as unknown as Knex,
      db,
    )
    expect(context.currentUser).toMatchObject({
      id: 'admin',
      oldID: null,
      sudo: true,
    })
    expect(context.currentUserLegacy).toBeNull()
    const result = await graphql({
      schema,
      source: '{ me { id } }',
      contextValue: context,
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.me).toEqual({ id: 'admin' })
    for (const operation of [
      'createProject(data: {name: "Project", commercial: false})',
      'createTask(data: {title: "Task"})',
      'createTaskWorkLog(data: {taskId: "old-task", content: "Work"})',
      'createTimer(data: {taskId: "old-task"})',
    ]) {
      const denied = await graphql({
        schema,
        source: `mutation { ${operation} { id } }`,
        contextValue: context,
      })
      expect(denied.errors?.[0].extensions.code).toBe('UNAUTHENTICATED')
    }
    expect(legacy).not.toHaveBeenCalled()
  } finally {
    await db.destroy()
  }
})
