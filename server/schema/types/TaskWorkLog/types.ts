import { builder } from '../../builder'
import type { WorkLogRecord } from './interfaces'
import { User } from '../User/types'
import type { UserRecord } from '../User/interfaces'
import { translated } from '../../helpers/translated'
import { Task } from '../Task/types'
import type { TaskRecord } from '../Task/interfaces'

export const WorkLog = builder.objectRef<WorkLogRecord>('TaskWorkLog')
WorkLog.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    content: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'content', c) ?? r.content,
    }),
    Task: t.field({
      type: Task,
      resolve: (r, _, c) =>
        c.dbOld<TaskRecord>('Task').where('id', r.taskId).first(),
    }),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.dbOld<UserRecord>('User').where('id', r.createdById).first(),
    }),
  }),
})
