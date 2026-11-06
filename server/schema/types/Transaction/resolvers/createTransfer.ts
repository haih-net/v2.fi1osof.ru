import { randomUUID } from 'node:crypto'
import { builder, type Context } from '../../../builder'
import { Transaction, type TransactionRecord } from '../types'
import {
  upsertBalance,
  validateAmount,
} from '../../Balance/helpers/upsertBalance'
import type { BalanceRecord } from '../../User/types'

const CreateTransferInput = builder.inputType('CreateTransferInput', {
  fields: (t) => ({
    toUserId: t.string({ required: true }),
    amount: t.float({ required: true }),
    title: t.string(),
  }),
})
export async function createTransfer(
  data: typeof CreateTransferInput.$inferInput,
  ctx: Context,
): Promise<TransactionRecord> {
  const user = ctx.currentUser
  if (!user || user.status !== 'active') {
    throw new Error('Доступ запрещён')
  }
  validateAmount(data.amount)
  if (data.toUserId === user.id) {
    throw new Error('Нельзя переводить самому себе')
  }
  return ctx.db.transaction(async (db) => {
    const updated = await db<BalanceRecord>('Balance')
      .where('userId', user.id)
      .where('amount', '>=', data.amount)
      .update({
        amount: db.raw('ROUND(amount - ?, 6)', [data.amount]),
        updatedAt: new Date(),
      })
    if (updated !== 1) {
      throw new Error('Недостаточно средств')
    }
    const recipient = await db('User')
      .where({ id: data.toUserId, status: 'active' })
      .first()
    if (!recipient) {
      throw new Error('Получатель не найден или заблокирован')
    }
    const sender = await db<BalanceRecord>('Balance')
      .where('userId', user.id)
      .first()
    if (!sender) {
      throw new Error('Баланс не найден')
    }
    const receiver = await upsertBalance(db, data.toUserId)
    if (
      !Number.isSafeInteger(Math.round((receiver.amount + data.amount) * 1e6))
    ) {
      throw new Error('Превышен допустимый баланс')
    }
    const outgoing: TransactionRecord = {
      id: randomUUID(),
      createdAt: new Date(),
      type: 'TransferOut',
      amount: -data.amount,
      title: data.title ?? null,
      userId: user.id,
      balanceId: sender.id,
      parentId: null,
    }
    await db<TransactionRecord>('Transaction').insert(outgoing)
    await db<TransactionRecord>('Transaction').insert({
      ...outgoing,
      id: randomUUID(),
      type: 'TransferIn',
      amount: data.amount,
      userId: data.toUserId,
      balanceId: receiver.id,
      parentId: outgoing.id,
    })
    await db<BalanceRecord>('Balance')
      .where('id', receiver.id)
      .update({
        amount: db.raw('ROUND(amount + ?, 6)', [data.amount]),
        updatedAt: new Date(),
      })
    return outgoing
  })
}
builder.mutationField('createTransfer', (t) =>
  t.field({
    authScopes: { active: true },
    type: Transaction,
    args: { data: t.arg({ type: CreateTransferInput, required: true }) },
    resolve: (_root, { data }, ctx) => createTransfer(data, ctx),
  }),
)
