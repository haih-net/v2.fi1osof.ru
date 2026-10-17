import { GraphQLError } from 'graphql'
import type { Context } from '../../../builder'
import type { TaskRecord } from '../interfaces'
import { TaskWhere } from '../inputs'

type TaskFilter = typeof TaskWhere.$inferInput
export function tasks(ctx: Context, where?: TaskFilter | null) {
  const q = ctx.dbOld<TaskRecord>('Task')
  if (where?.projectId) {
    q.where('projectId', where.projectId)
  }
  if (where?.status) {
    const statuses: Record<string, string> = {
      NEW: 'New',
      PROGRESS: 'Progress',
      DONE: 'Done',
      REJECTED: 'Rejected',
    }
    const status = statuses[where.status]
    if (!status) {
      throw new GraphQLError('Invalid status', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }
    q.where('status', status)
  } else if (where?.incompletedOnly) {
    q.whereIn('status', ['New', 'Progress'])
  }
  return q
}
