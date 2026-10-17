import { builder } from '../../../builder'
import { WorkLog } from '../types'
import type { WorkLogRecord } from '../interfaces'
import { windowed } from '../../../helpers/pagination'
import { Unique } from '../../../inputs'

builder.queryField('taskWorkLogs', (t) =>
  t.field({
    type: [WorkLog],
    args: { skip: t.arg.int(), take: t.arg.int() },
    resolve: (_, a, c) =>
      windowed(
        c.dbOld<WorkLogRecord>('TaskWorkLog').orderBy('createdAt', 'desc'),
        a.skip,
        a.take,
      ),
  }),
)
builder.queryField('taskWorkLogCount', (t) =>
  t.int({
    resolve: async (_, __, c) =>
      Number((await c.dbOld('TaskWorkLog').count('* as count'))[0].count),
  }),
)
builder.queryField('taskWorkLog', (t) =>
  t.field({
    type: WorkLog,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: (_, a, c) =>
      a.where.id
        ? c.dbOld<WorkLogRecord>('TaskWorkLog').where('id', a.where.id).first()
        : null,
  }),
)
