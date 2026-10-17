import type { Request } from 'express'
import type { Knex } from 'knex'
import { dbOld } from './database_old'
import { authenticate } from './schema/types/User/helpers/auth'
import type { Context } from './schema/builder'

export async function createContext(
  req: Request,
  databaseOld: Knex = dbOld,
): Promise<Context> {
  const header = req.headers.authorization
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null
  return {
    req,
    dbOld: databaseOld,
    currentUser: token ? await authenticate(token, databaseOld) : null,
  }
}
