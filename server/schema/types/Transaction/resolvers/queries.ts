import { builder } from '../../../builder'
import { Transaction, type TransactionRecord } from '../types'

builder.queryField('myTransactions', (t) =>
  t.field({
    authScopes: { active: true },
    type: [Transaction],
    args: { skip: t.arg.int(), take: t.arg.int() },
    resolve: (_root, { skip = 0, take = 10 }, ctx) => {
      if (!ctx.currentUser) {
        throw new Error('Доступ запрещён')
      }
      if ((skip ?? 0) < 0 || (take ?? 10) < 0 || (take ?? 10) > 100) {
        throw new Error('Некорректная пагинация')
      }
      return ctx
        .db<TransactionRecord>('Transaction')
        .where('userId', ctx.currentUser.id)
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .offset(skip ?? 0)
        .limit(take ?? 10)
    },
  }),
)
builder.queryField('myTransactionsCount', (t) =>
  t.int({
    authScopes: { active: true },
    resolve: async (_root, _args, ctx) => {
      if (!ctx.currentUser) {
        throw new Error('Доступ запрещён')
      }
      const row = await ctx
        .db('Transaction')
        .where('userId', ctx.currentUser.id)
        .count({ count: '*' })
        .first()
      return Number(row?.count ?? 0)
    },
  }),
)
