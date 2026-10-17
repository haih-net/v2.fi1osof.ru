import type { Request } from 'express'
import type { Knex } from 'knex'
import { dbOld } from './database_old'
import { db } from './database'
import { authenticate } from './schema/types/User/helpers/auth'
import type { Context } from './schema/builder'

export async function createContext(
  req: Request,
  databaseOld: Knex = dbOld,
  database: Knex = db,
): Promise<Context> {
  const header = req.headers.authorization
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null
  return {
    req,
    dbOld: databaseOld,
    currentUser: token ? await authenticate(token, databaseOld) : null,
    db: database,
  }
}
