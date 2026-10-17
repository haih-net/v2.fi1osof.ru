import '../env'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Database } from 'better-sqlite3'
import knex, { type Knex } from 'knex'
import { initializeSchema } from './schema'

function restoreTypes(result: unknown): unknown {
  if (Array.isArray(result)) {
    return result.map(restoreTypes)
  }
  if (!result || typeof result !== 'object') {
    return result
  }
  const row = result as Record<string, unknown>
  for (const field of ['createdAt', 'updatedAt', 'expiredAt']) {
    if (typeof row[field] === 'number') {
      row[field] = new Date(row[field])
    }
  }
  for (const field of ['sudo', 'isAiAgent']) {
    if (typeof row[field] === 'number') {
      row[field] = Boolean(row[field])
    }
  }
  if (typeof row.data === 'string') {
    row.data = JSON.parse(row.data)
  }
  return row
}

export function createDatabase(): Knex {
  const filename = process.env.DATABASE_FILENAME
  if (!filename?.trim()) {
    throw new Error('DATABASE_FILENAME environment variable is required')
  }
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true })
  }
  return knex({
    client: 'better-sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1,
      afterCreate(
        connection: Database,
        done: (error: Error | null, connection: Database) => void,
      ): void {
        try {
          connection.pragma('busy_timeout = 5000')
          connection.pragma('journal_mode = WAL')
          connection.pragma('foreign_keys = ON')
          connection.function(
            'lower',
            { deterministic: true },
            (value: unknown) =>
              typeof value === 'string' ? value.toLowerCase() : null,
          )
          initializeSchema(connection)
          done(null, connection)
        } catch (error) {
          done(
            error instanceof Error ? error : new Error(String(error)),
            connection,
          )
        }
      },
    },
    postProcessResponse: restoreTypes,
    acquireConnectionTimeout: 10000,
  })
}

export const db: Knex = createDatabase()
