import { builder } from '../../builder'
import type { TaskRecord } from './interfaces'
import { User } from '../User/types'
import type { UserRecord } from '../User/interfaces'
import { translated } from '../../helpers/translated'
import { Project } from '../Project/types'
import type { ProjectRecord } from '../Project/interfaces'
import { WorkLog } from '../TaskWorkLog/types'
import type { WorkLogRecord } from '../TaskWorkLog/interfaces'

export const Task = builder.objectRef<TaskRecord>('Task')
Task.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    title: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'title', c) ?? r.title,
    }),
    description: t.string({
      resolve: (r, _, c) => translated(r, 'description', c),
    }),
    content: t.string({ resolve: (r, _, c) => translated(r, 'content', c) }),
    status: t.exposeString('status', { nullable: false }),
    Project: t.field({
      type: Project,
      resolve: (r, _, c) =>
        r.projectId
          ? c.dbOld<ProjectRecord>('Project').where('id', r.projectId).first()
          : null,
    }),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.dbOld<UserRecord>('User').where('id', r.createdById).first(),
    }),
    Assignee: t.field({
      type: User,
      resolve: (r, _, c) =>
        r.assigneeId
          ? c.dbOld<UserRecord>('User').where('id', r.assigneeId).first()
          : null,
    }),
    WorkLogs: t.field({
      type: [WorkLog],
      resolve: (r, _, c) =>
        c
          .dbOld<WorkLogRecord>('TaskWorkLog')
          .where('taskId', r.id)
          .orderBy('createdAt', 'asc'),
    }),
  }),
})
