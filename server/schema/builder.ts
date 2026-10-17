import { GraphQLUpload } from 'graphql-upload-minimal'
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects'
import type { Request } from 'express'
import SchemaBuilder from '@pothos/core'
import { DateTimeResolver, JSONResolver } from 'graphql-scalars'
import { UserRecord } from './types/User/interfaces'
import { Knex } from 'knex'

export interface Context {
  req: Request
  db: Knex
  currentUser: UserRecord | null
}

export const builder = new SchemaBuilder<{
  Context: Context
  Scalars: {
    Upload: { Input: unknown; Output: unknown }
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

builder.addScalarType('Upload', GraphQLUpload)

builder.addScalarType('DateTime', DateTimeResolver)
builder.addScalarType('Json', JSONResolver)

builder.queryType({
  fields: (t) => ({
    health: t.string({
      resolve: () => 'ok',
    }),
  }),
})
