import { builder } from '../../builder'
import { User } from '../User/types'
import type { UserRecord } from '../User/interfaces'

export interface TransactionRecord {
  id: string
  createdAt: Date
  type: 'TopUp' | 'TransferIn' | 'TransferOut'
  amount: number
  title: string | null
  userId: string
  balanceId: string
  parentId: string | null
}
export const TransactionTypeEnum = builder.enumType('TransactionType', {
  values: ['TopUp', 'TransferIn', 'TransferOut'] as const,
})
export const Transaction = builder.objectRef<TransactionRecord>('Transaction')
Transaction.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    type: t.expose('type', { type: TransactionTypeEnum, nullable: false }),
    amount: t.exposeFloat('amount', { nullable: false }),
    title: t.exposeString('title', { nullable: true }),
    userId: t.exposeString('userId', { nullable: false }),
    balanceId: t.exposeString('balanceId', { nullable: false }),
    User: t.field({
      type: User,
      resolve: async (row, _args, ctx) => {
        const user = await ctx
          .db<UserRecord>('User')
          .where('id', row.userId)
          .first()
        if (!user) {
          throw new Error('Пользователь не найден')
        }
        return user
      },
    }),
    Parent: t.field({
      type: Transaction,
      nullable: true,
      resolve: async (row, _args, ctx) =>
        row.parentId
          ? ((await ctx
              .db<TransactionRecord>('Transaction')
              .where('id', row.parentId)
              .first()) ?? null)
          : null,
    }),
    Children: t.field({
      type: [Transaction],
      resolve: (row, _args, ctx) =>
        ctx.db<TransactionRecord>('Transaction').where('parentId', row.id),
    }),
  }),
})
