import { builder } from '../../builder'
import type { PageErrorRecord } from './interfaces'

export const PageErrorStatus = builder.enumType('PageErrorStatus', {
  values: ['Review', 'Resolved'] as const,
})
export const PageErrorSort = builder.enumType('PageErrorSort', {
  values: ['Url', 'LastOccurredAt'] as const,
})
export const PageError = builder
  .objectRef<PageErrorRecord>('PageError')
  .implement({
    fields: (t) => ({
      url: t.exposeString('url', { nullable: false }),
      statusCode: t.exposeInt('statusCode', { nullable: true }),
      count: t.exposeInt('count', { nullable: false }),
      lastOccurredAt: t.field({
        type: 'DateTime',
        nullable: false,
        resolve: (row) => new Date(row.lastOccurredAt),
      }),
      status: t.field({
        type: PageErrorStatus,
        nullable: true,
        resolve: (row) => row.status,
      }),
    }),
  })
