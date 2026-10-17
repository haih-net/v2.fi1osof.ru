import { builder } from '../../../builder'
import { Task } from '../types'
import type { TaskRecord } from '../interfaces'
import { windowed } from '../../../helpers/pagination'
import { Unique } from '../../../inputs'
import { TaskWhere } from '../inputs'
import { tasks } from '../helpers/queries'

builder.queryField('tasks', (t) =>
  t.field({
    type: [Task],
    args: {
      where: t.arg({ type: TaskWhere }),
      skip: t.arg.int(),
      take: t.arg.int(),
    },
    resolve: (_, a, c) =>
      windowed(tasks(c, a.where).orderBy('createdAt', 'desc'), a.skip, a.take),
  }),
)
builder.queryField('tasksCount', (t) =>
  t.int({
    args: { where: t.arg({ type: TaskWhere }) },
    resolve: async (_, a, c) =>
      Number(
        (await tasks(c, a.where).count<{ count: string }[]>('* as count'))[0]
          .count,
      ),
  }),
)
builder.queryField('task', (t) =>
  t.field({
    type: Task,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: (_, a, c) =>
      a.where.id
        ? c.dbOld<TaskRecord>('Task').where('id', a.where.id).first()
        : null,
  }),
)
