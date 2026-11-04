import { builder } from '../../../builder'
import { PageError, PageErrorSort } from '../types'
import type { PageErrorRecord } from '../interfaces'

builder.queryField('pageErrors', (t) =>
  t.field({
    type: [PageError],
    nullable: false,
    authScopes: { sudo: true },
    args: { sort: t.arg({ type: PageErrorSort, defaultValue: 'Url' }) },
    resolve: (_root, { sort }, ctx) => {
      const query = ctx
        .db<PageErrorRecord>('PageError')
        .whereNull('status')
        .orWhere('status', 'Review')
      if (sort === 'LastOccurredAt') {
        query.orderBy('lastOccurredAt', 'desc')
      }
      return query.orderBy('url', 'asc')
    },
  }),
)
