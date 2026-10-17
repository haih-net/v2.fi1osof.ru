import { createRequire } from 'node:module'
import type { Request } from 'express'
import knex from 'knex'
import { describe, expect, it } from 'vitest'
import { schema } from '../../index'
import type { Context } from '../../builder'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

describe('Concept visibility during migration', () => {
  it.each([
    ['{ concepts { id } }', 'not `visibility` =', 'unpublished'],
    ['{ kBConceptsCount }', 'not `visibility` =', 'unpublished'],
    [
      '{ concept(where: { id: "hidden-company" }) { id } }',
      'not `visibility` =',
      'unpublished',
    ],
    [
      '{ concept(where: { uri: "/companies/hidden-company" }) { id } }',
      'not `visibility` =',
      'unpublished',
    ],
    [
      '{ concepts(where: { visibility: null }) { id } }',
      'not `visibility` =',
      'unpublished',
    ],
    [
      '{ concepts(where: { visibility: public }) { id } }',
      '`visibility` =',
      'public',
    ],
    [
      '{ concepts(where: { visibility: hidden }) { id } }',
      '`visibility` =',
      'hidden',
    ],
    [
      '{ concepts(where: { visibility: unpublished }) { id } }',
      '`visibility` =',
      'unpublished',
    ],
    [
      '{ kBConceptsCount(where: { visibility: hidden }) }',
      '`visibility` =',
      'hidden',
    ],
  ])('%s', async (source, predicate, visibility) => {
    const queries: { sql: string; bindings: readonly unknown[] }[] = []
    const db = knex({ client: 'better-sqlite3', useNullAsDefault: true })
    // Capture the executed SQL without connecting to or changing a database.
    db.client.runner = (builder: ReturnType<typeof db>) =>
      ({
        run: async (): Promise<unknown> => {
          const query = builder.toSQL()
          queries.push({ sql: query.sql, bindings: query.bindings })
          if (query.sql.includes('count(')) {
            return [{ count: '0' }]
          }
          return query.method === 'first' ? undefined : []
        },
      }) as ReturnType<typeof db.client.runner>
    const context: Context = {
      dbOld: db,
      db,
      req: {} as Request,
      currentUser: null,
    }
    try {
      const result = await graphql({ schema, source, contextValue: context })
      expect(result.errors).toBeUndefined()
      expect(queries).toHaveLength(1)
      expect(queries[0].sql).toContain(predicate)
      expect(queries[0].bindings[0]).toBe(visibility)
      expect(queries[0].sql.match(/`visibility`/g)).toHaveLength(1)
    } finally {
      await db.destroy()
    }
  })
})
