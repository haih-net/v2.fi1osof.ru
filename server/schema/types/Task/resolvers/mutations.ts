import { randomUUID } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { Unique } from '../../../inputs'
import { authenticated, requiredId, nonempty } from '../../../helpers/mutations'
import { Task } from '../types'
import type { TaskRecord } from '../interfaces'
import { TaskCreate, TaskUpdate } from '../inputs'

builder.mutationField('createTask', (t) =>
  t.field({
    type: Task,
    args: { data: t.arg({ type: TaskCreate, required: true }) },
    resolve: async (_, { data }, ctx) => {
      const user = authenticated(ctx)
      const rows = await ctx
        .dbOld<TaskRecord>('Task')
        .insert({
          ...data,
          id: randomUUID(),
          title: nonempty(data.title),
          createdById: user.id,
          assigneeId: data.assigneeId === undefined ? user.id : data.assigneeId,
          projectId: data.projectId || null,
        })
        .returning('*')
      return rows[0]
    },
  }),
)
builder.mutationField('updateTask', (t) =>
  t.field({
    type: Task,
    args: {
      where: t.arg({ type: Unique, required: true }),
      data: t.arg({ type: TaskUpdate, required: true }),
    },
    resolve: async (_, { where, data }, ctx) => {
      const user = authenticated(ctx)
      const id = requiredId(where.id)
      const task = await ctx.dbOld<TaskRecord>('Task').where({ id }).first()
      if (!task) {
        throw new GraphQLError('Задача не найдена')
      }
      if (!user.sudo && task.createdById !== user.id) {
        throw new GraphQLError('Доступ запрещён')
      }
      return (
        await ctx
          .dbOld<TaskRecord>('Task')
          .where({ id })
          .update({
            ...data,
            title:
              data.title === null || data.title === undefined
                ? undefined
                : nonempty(data.title),
            status: data.status ?? undefined,
            projectId: data.projectId === '' ? null : data.projectId,
            updatedAt: new Date(),
          })
          .returning('*')
      )[0]
    },
  }),
)
