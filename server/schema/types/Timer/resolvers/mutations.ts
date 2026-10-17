import { randomUUID } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { Unique } from '../../../inputs'
import { authenticated, requiredId } from '../../../helpers/mutations'
import { Timer } from '../types'
import type { TimerRecord } from '../interfaces'
import { TimerCreate, TimerUpdate } from '../inputs'

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
