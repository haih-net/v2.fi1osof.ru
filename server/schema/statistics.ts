import { builder } from './builder'
import { logStatistics } from '../statistics'

const SiteStatistic = builder
  .objectRef<{ id: string }>('SiteStatistic')
  .implement({
    fields: (t) => ({ id: t.exposeString('id') }),
  })

builder.mutationType({
  fields: (t) => ({
    logStats: t.field({
      type: [SiteStatistic],
      nullable: true,
      args: { data: t.arg({ type: 'Json', required: true }) },
      resolve: (_root, { data }, ctx) => logStatistics(data, ctx.req, ctx.db),
    }),
  }),
})
