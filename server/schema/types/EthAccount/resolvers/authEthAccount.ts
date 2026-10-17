import { randomUUID } from 'node:crypto'
import { builder, type Context } from '../../../builder'
import { EthAccountAuthInput, EthAccountAuthPayload } from '../inputs'
import {
  verifyNonce,
  verifySignature,
  buildSignMessage,
  normalizeAddress,
} from '../helpers/crypto'
import { checkReferrerToken } from '../../User/helpers/checkReferrerToken'
import { createToken } from '../../User/helpers/auth'
import type { TokenRecord, UserRecord } from '../../User/interfaces'

interface EthAccountRecord {
  id: string
  address: string
  userId: string | null
  createdAt: Date
  updatedAt: Date
}
interface AuthResult {
  success: boolean
  message: string | null
  token: string | null
}

export async function authEthAccount(
  data: typeof EthAccountAuthInput.$inferInput,
  ctx: Context,
): Promise<AuthResult> {
  const { address, signature, nonce, referrerToken } = data
  const nonceId = verifyNonce(nonce, address)
  if (!nonceId) {
    return {
      success: false,
      message: 'Одноразовый код недействителен или срок его действия истёк',
      token: null,
    }
  }
  if (!verifySignature(buildSignMessage(nonce), signature, address)) {
    return { success: false, message: 'Недействительная подпись', token: null }
  }
  const normalizedAddress = normalizeAddress(address)
  return ctx.dbOld.transaction(async (dbOld) => {
    // Claim the challenge inside the transaction so concurrent replays cannot sign in.
    const consumed = await dbOld<TokenRecord>('Token')
      .where({ id: nonceId })
      .whereNull('userId')
      .where('expiredAt', '>', new Date())
      .delete()
    if (consumed !== 1) {
      return {
        success: false,
        message: 'Одноразовый код недействителен или срок его действия истёк',
        token: null,
      }
    }
    // Serialize first-time sign-ins for the same wallet across server instances.
    // SQLite's preceding DELETE holds the write lock until this transaction ends.
    const account = await dbOld<EthAccountRecord>('EthAccount')
      .where({ address: normalizedAddress })
      .first()
    if (
      ctx.currentUser &&
      account?.userId &&
      account.userId !== ctx.currentUser.id
    ) {
      return {
        success: false,
        message: 'Кошелёк привязан к другой учётной записи',
        token: null,
      }
    }
    let userId = account?.userId ?? ctx.currentUser?.id
    if (!userId) {
      const referrerId = await checkReferrerToken(referrerToken, dbOld)
      userId = randomUUID()
      await dbOld<UserRecord & { referrerId: string | null }>('User').insert({
        id: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        sudo: false,
        isAiAgent: false,
        referrerId,
      })
    }
    if (!account?.userId) {
      const existingWallet = await dbOld<EthAccountRecord>('EthAccount')
        .where({ userId })
        .first()
      if (existingWallet && existingWallet.id !== account?.id) {
        throw new Error('К учётной записи уже привязан кошелёк')
      }
      if (account) {
        await dbOld<EthAccountRecord>('EthAccount')
          .where({ id: account.id })
          .update({ userId, updatedAt: new Date() })
      } else {
        await dbOld<EthAccountRecord>('EthAccount').insert({
          id: randomUUID(),
          address: normalizedAddress,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    }
    const user = await dbOld<UserRecord>('User').where({ id: userId }).first()
    if (!user) {
      throw new Error('Пользователь не найден')
    }
    return {
      success: true,
      message: null,
      token: await createToken(user, dbOld),
    }
  })
}

builder.mutationField('authEthAccount', (t) =>
  t.field({
    type: EthAccountAuthPayload,
    args: { data: t.arg({ type: EthAccountAuthInput, required: true }) },
    resolve: (_root, { data }, ctx) => authEthAccount(data, ctx),
  }),
)
