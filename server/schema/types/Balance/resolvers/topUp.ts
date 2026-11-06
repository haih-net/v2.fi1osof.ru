import { randomUUID } from 'node:crypto'
import { builder, type Context } from '../../../builder'
import { Balance, type BalanceRecord } from '../../User/types'
import type { TransactionRecord } from '../../Transaction/types'
import { upsertBalance, validateAmount } from '../helpers/upsertBalance'
import {
  createTopUpOffer,
  getPaymentConfig,
  verifyTopUpOffer,
  verifyUsdtTransaction,
} from '../helpers/topUp'

const TopUpRequestPayload = builder.simpleObject('TopUpRequestPayload', {
  fields: (t) => ({
    message: t.string({ nullable: false }),
    recipientAddress: t.string({ nullable: false }),
    usdtContractAddress: t.string({ nullable: false }),
    chainId: t.int({ nullable: false }),
  }),
})
const TopUpBalanceInput = builder.inputType('TopUpBalanceInput', {
  fields: (t) => ({
    message: t.string({ required: true }),
    signature: t.string({ required: true }),
    txHash: t.string({ required: true }),
  }),
})
builder.mutationField('requestTopUp', (t) =>
  t.field({
    authScopes: { active: true },
    type: TopUpRequestPayload,
    resolve: (_root, _args, ctx) => {
      if (!ctx.currentUser) {
        throw new Error('Доступ запрещён')
      }
      return {
        ...getPaymentConfig(),
        message: createTopUpOffer(ctx.currentUser.id),
      }
    },
  }),
)
export async function creditTopUp(
  ctx: Context,
  chainId: number,
  txHash: string,
  amount: number,
): Promise<BalanceRecord> {
  const user = ctx.currentUser
  if (!user || user.status !== 'active') {
    throw new Error('Доступ запрещён')
  }
  validateAmount(amount)
  return ctx.db.transaction(async (db) => {
    const balance = await upsertBalance(db, user.id)
    if (!Number.isSafeInteger(Math.round((balance.amount + amount) * 1e6))) {
      throw new Error('Превышен допустимый баланс')
    }
    const id = randomUUID()
    await db<TransactionRecord>('Transaction').insert({
      id,
      createdAt: new Date(),
      type: 'TopUp',
      amount,
      title: 'Top up balance',
      userId: user.id,
      balanceId: balance.id,
      parentId: null,
    })
    await db('EthTransaction').insert({
      id: randomUUID(),
      chainId,
      txHash: txHash.toLowerCase(),
      transactionId: id,
    })
    const [updated] = await db<BalanceRecord>('Balance')
      .where('id', balance.id)
      .update({
        amount: db.raw('ROUND(amount + ?, 6)', [amount]),
        updatedAt: new Date(),
      })
      .returning('*')
    return updated
  })
}
builder.mutationField('topUpBalance', (t) =>
  t.field({
    authScopes: { active: true },
    type: Balance,
    args: { data: t.arg({ type: TopUpBalanceInput, required: true }) },
    resolve: async (_root, { data }, ctx) => {
      if (!ctx.currentUser) {
        throw new Error('Доступ запрещён')
      }
      const account = await ctx
        .db<{ address: string }>('EthAccount')
        .where('userId', ctx.currentUser.id)
        .first()
      if (!account) {
        throw new Error('Подключите кошелёк')
      }
      verifyTopUpOffer(
        data.message,
        data.signature,
        account.address,
        ctx.currentUser.id,
      )
      const { chainId } = getPaymentConfig()
      const existing = await ctx
        .db('EthTransaction')
        .where({ chainId, txHash: data.txHash.toLowerCase() })
        .first()
      if (existing) {
        const credited = await ctx
          .db<TransactionRecord>('Transaction')
          .where({ id: existing.transactionId, userId: ctx.currentUser.id })
          .first()
        const balance = credited
          ? await ctx
              .db<BalanceRecord>('Balance')
              .where('id', credited.balanceId)
              .first()
          : undefined
        if (!balance) {
          throw new Error('Этот платёж уже зачислен другому пользователю')
        }
        return balance
      }
      const amount = await verifyUsdtTransaction(data.txHash, account.address)
      return creditTopUp(ctx, chainId, data.txHash, amount)
    },
  }),
)
