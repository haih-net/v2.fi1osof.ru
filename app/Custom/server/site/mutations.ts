import { randomUUID } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { builder, type Context } from '../../../../server/schema/builder'
import {
  Task,
  WorkLog,
  Timer,
  Unique,
  type TaskRecord,
  type WorkLogRecord,
  type TimerRecord,
} from './index'
import type { UserRecord } from '../../../../server/schema/types/User/interfaces'

function authenticated(ctx: Context): UserRecord {
  if (!ctx.currentUser) {
    throw new GraphQLError('Не авторизован', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.currentUser
}
function requiredId(id: string | null | undefined): string {
  if (!id) {
    throw new GraphQLError('Не указан ID')
  }
  return id
}
function nonempty(value: string): string {
  if (!value.trim()) {
    throw new GraphQLError('Заполните обязательное поле')
  }
  return value
}
const TaskStatus = builder.enumType('TaskStatusEnum', {
  values: {
    NEW: { value: 'New' },
    PROGRESS: { value: 'Progress' },
    DONE: { value: 'Done' },
    REJECTED: { value: 'Rejected' },
  },
})
const TaskCreate = builder.inputType('TaskCreateInput', {
  fields: (t) => ({
    title: t.string({ required: true }),
    description: t.string(),
    content: t.string(),
    projectId: t.string(),
    parentId: t.string(),
    assigneeId: t.string(),
    startDatePlaning: t.field({ type: 'DateTime' }),
    endDatePlaning: t.field({ type: 'DateTime' }),
  }),
})
const TaskUpdate = builder.inputType('TaskUpdateInput', {
  fields: (t) => ({
    title: t.string(),
    description: t.string(),
    content: t.string(),
    projectId: t.string(),
    assigneeId: t.string(),
    status: t.field({ type: TaskStatus }),
    startDatePlaning: t.field({ type: 'DateTime' }),
    endDatePlaning: t.field({ type: 'DateTime' }),
    startDate: t.field({ type: 'DateTime' }),
    endDate: t.field({ type: 'DateTime' }),
  }),
})
const WorkLogCreate = builder.inputType('TaskWorkLogCreateInput', {
  fields: (t) => ({
    taskId: t.string({ required: true }),
    content: t.string({ required: true }),
  }),
})
const WorkLogUpdate = builder.inputType('TaskWorkLogUpdateInput', {
  fields: (t) => ({ content: t.string() }),
})
const TimerCreate = builder.inputType('TimerCreateInput', {
  fields: (t) => ({
    taskId: t.string({ required: true }),
    startedAt: t.field({ type: 'DateTime' }),
  }),
})
const TimerUpdate = builder.inputType('TimerUpdateDataInput', {
  fields: (t) => ({
    startedAt: t.field({ type: 'DateTime' }),
    stoppedAt: t.field({ type: 'DateTime' }),
  }),
})

export function registerSiteMutations(): void {
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
            assigneeId:
              data.assigneeId === undefined ? user.id : data.assigneeId,
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
  builder.mutationField('createTimer', (t) =>
    t.field({
      type: Timer,
      args: { data: t.arg({ type: TimerCreate, required: true }) },
      resolve: async (_, { data }, ctx) => {
        const user = authenticated(ctx)
        return ctx.dbOld.transaction(async (trx) => {
          // Сериализация запусков одного пользователя сохраняет единственный активный таймер.
          await trx('User').where({ id: user.id }).forUpdate().first()
          if (!(await trx('Task').where({ id: data.taskId }).first())) {
            throw new GraphQLError('Задача не найдена')
          }
          const running = trx<TimerRecord>('Timer')
            .where({ createdById: user.id })
            .whereNull('stoppedAt')
          if (await running.clone().where({ taskId: data.taskId }).first()) {
            throw new GraphQLError('Таймер уже запущен на этой задаче')
          }
          const now = new Date()
          await running.update({ stoppedAt: now, updatedAt: now })
          return (
            await trx<TimerRecord>('Timer')
              .insert({
                id: randomUUID(),
                taskId: data.taskId,
                createdById: user.id,
                startedAt: data.startedAt ?? now,
              })
              .returning('*')
          )[0]
        })
      },
    }),
  )
  builder.mutationField('updateTimer', (t) =>
    t.field({
      type: Timer,
      args: {
        where: t.arg({ type: Unique, required: true }),
        data: t.arg({ type: TimerUpdate, required: true }),
      },
      resolve: async (_, { where, data }, ctx) => {
        const user = authenticated(ctx)
        const id = requiredId(where.id)
        const timer = await ctx.dbOld<TimerRecord>('Timer').where({ id }).first()
        if (!timer) {
          throw new GraphQLError('Таймер не найден')
        }
        if (timer.createdById !== user.id && !user.sudo) {
          throw new GraphQLError('Доступ запрещён')
        }
        return (
          await ctx
            .dbOld<TimerRecord>('Timer')
            .where({ id })
            .update({
              startedAt: data.startedAt ?? undefined,
              stoppedAt: data.stoppedAt ?? undefined,
              updatedAt: new Date(),
            })
            .returning('*')
        )[0]
      },
    }),
  )
}
