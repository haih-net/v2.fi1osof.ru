import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { PageError, PageErrorStatus } from '../types'
import type { PageErrorRecord } from '../interfaces'

builder.mutationField('updatePageError', (t) =>
  t.field({
    type: PageError,
    nullable: false,
    authScopes: { sudo: true },
    args: {
      url: t.arg.string({ required: true }),
      count: t.arg.int({ required: true }),
      status: t.arg({ type: PageErrorStatus, required: true }),
    },
    resolve: async (_root, { url, count, status }, ctx) => {
      const query = ctx.db<PageErrorRecord>('PageError').where({ url, count })
      if (status === 'Review') {
        query.whereNull('status')
      } else {
        query.where('status', 'Review')
      }
      const [updated] = await query.update({ status }).returning('*')
      if (!updated) {
        throw new GraphQLError(
          'The error has changed. Refresh the list before updating its status.',
        )
      }
      return updated
    },
  }),
)
builder.mutationField('clearResolvedPageErrors', (t) =>
  t.int({
    nullable: false,
    authScopes: { sudo: true },
    resolve: (_root, _args, ctx) =>
      ctx.db('PageError').where('status', 'Resolved').delete(),
  }),
)
