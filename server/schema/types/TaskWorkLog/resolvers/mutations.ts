import { randomUUID } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { Unique } from '../../../inputs'
import { authenticated, requiredId, nonempty } from '../../../helpers/mutations'
import { WorkLog } from '../types'
import type { WorkLogRecord } from '../interfaces'
import { WorkLogCreate, WorkLogUpdate } from '../inputs'

builder.mutationField('createTaskWorkLog', (t) =>
  t.field({
    type: WorkLog,
    args: { data: t.arg({ type: WorkLogCreate, required: true }) },
    resolve: async (_, { data }, ctx) => {
      const user = authenticated(ctx)
      if (!(await ctx.dbOld('Task').where({ id: data.taskId }).first())) {
        throw new GraphQLError('Задача не найдена')
      }
      return (
        await ctx
          .dbOld<WorkLogRecord>('TaskWorkLog')
          .insert({
            id: randomUUID(),
            taskId: data.taskId,
            content: nonempty(data.content),
            createdById: user.id,
          })
          .returning('*')
      )[0]
    },
  }),
)
builder.mutationField('updateTaskWorkLog', (t) =>
  t.field({
    type: WorkLog,
    args: {
      where: t.arg({ type: Unique, required: true }),
      data: t.arg({ type: WorkLogUpdate, required: true }),
    },
    resolve: async (_, { where, data }, ctx) => {
      const user = authenticated(ctx)
      const filter = { id: requiredId(where.id), createdById: user.id }
      const log = await ctx
        .dbOld<WorkLogRecord>('TaskWorkLog')
        .where(filter)
        .first()
      if (!log) {
        throw new GraphQLError('Ворклог не найден')
      }
      if (data.content === null || data.content === undefined) {
        return log
      }
      return (
        await ctx
          .dbOld<WorkLogRecord>('TaskWorkLog')
          .where(filter)
          .update({ content: nonempty(data.content) })
          .returning('*')
      )[0]
    },
  }),
)
