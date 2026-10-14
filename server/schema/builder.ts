import SimpleObjectsPlugin from '@pothos/plugin-simple-objects'
import type { Request } from 'express'
import type { Knex } from 'knex'
import type { UserRecord } from './types/User/interfaces'
import SchemaBuilder from '@pothos/core'
import { DateTimeResolver, JSONResolver } from 'graphql-scalars'

export interface Context {
  req: Request
  db: Knex
  currentUser: UserRecord | null
}

export const builder = new SchemaBuilder<{
  Context: Context
  Scalars: {
    DateTime: {
      Input: Date
      Output: Date
    }
    Json: {
      Input: unknown
      Output: unknown
    }
  }
}>({
  plugins: [SimpleObjectsPlugin],
})

builder.addScalarType('DateTime', DateTimeResolver)
builder.addScalarType('Json', JSONResolver)

builder.queryType({
  fields: (t) => ({
    health: t.string({
      resolve: () => 'ok',
    }),
  }),
})

builder.mutationType({})
