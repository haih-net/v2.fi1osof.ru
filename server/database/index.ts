import '../env'
import knex, { type Knex } from 'knex'

export function createDatabase(): Knex {
  return knex({
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.PGHOST || '127.0.0.1',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    },
    pool: { min: 0, max: 10 },
    acquireConnectionTimeout: 10000,
  })
}

export const db: Knex = createDatabase()
