import { builder } from '../../builder'
import type { TimerRecord } from './interfaces'
import { Task } from '../Task/types'
import type { TaskRecord } from '../Task/interfaces'

export const Timer = builder.objectRef<TimerRecord>('Timer')
Timer.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdById: t.exposeString('createdById', { nullable: false }),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: false }),
    stoppedAt: t.expose('stoppedAt', { type: 'DateTime' }),
    Task: t.field({
      type: Task,
      resolve: (r, _, c) =>
        c.dbOld<TaskRecord>('Task').where('id', r.taskId).first(),
    }),
  }),
})
