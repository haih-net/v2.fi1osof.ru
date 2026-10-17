import '../env'
import knex, { type Knex } from 'knex'

export function createDatabase(): Knex {
  const connection = process.env.DATABASE_URL
  if (!connection) {
    throw new Error('Не задана переменная окружения DATABASE_URL')
  }

  return knex({
    client: 'pg',
    connection,
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 10000,
  })
}

export const dbOld: Knex = createDatabase()
