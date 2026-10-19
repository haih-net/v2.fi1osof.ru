import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { builder, type Context } from '../../../builder'
import { AuthPayload } from '../../User/inputs'
import { createToken } from '../../User/helpers/auth'
import { checkReferrerToken } from '../../User/helpers/checkReferrerToken'
import type { UserRecord } from '../../User/interfaces'

const TelegramAuthDataInput = builder.inputType('TelegramAuthDataInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    first_name: t.string(),
    last_name: t.string(),
    username: t.string(),
    photo_url: t.string(),
    auth_date: t.int({ required: true }),
    hash: t.string({ required: true }),
    referrerToken: t.string(),
  }),
})
type TelegramAuthData = typeof TelegramAuthDataInput.$inferInput
export function checkTelegramAuth(data: TelegramAuthData): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error('Вход через Telegram не настроен')
  }
  if (
    !/^\d+$/.test(data.id) ||
    !/^[a-f\d]{64}$/i.test(data.hash) ||
    data.auth_date > Date.now() / 1000 + 30 ||
    data.auth_date < Date.now() / 1000 - 300
  ) {
    return false
  }
  const { hash, referrerToken: _referrerToken, ...signed } = data
  const text = Object.entries(signed)
    .filter(([, value]) => value !== null && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  const secret = createHash('sha256').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(text).digest()
  return timingSafeEqual(expected, Buffer.from(hash, 'hex'))
}
export async function authViaTelegram(
  data: TelegramAuthData,
  ctx: Context,
): Promise<{ success: boolean; message: string | null; token: string | null }> {
  if (!checkTelegramAuth(data)) {
    throw new Error('Данные Telegram недействительны или устарели')
  }
  return ctx.dbOld.transaction(async (db) => {
    // Acquire a write lock before checking account ownership.
    await db('TelegramAccount')
      .where('externalKey', data.id)
      .update({ username: data.username ?? null })
    const account = await db<{ userId: string }>('TelegramAccount')
      .where('externalKey', data.id)
      .first()
    if (ctx.currentUser && account && ctx.currentUser.id !== account.userId) {
      throw new Error('Telegram уже привязан к другому пользователю')
    }
    let userId = account?.userId ?? ctx.currentUser?.id
    if (!userId) {
      const referrerId = await checkReferrerToken(data.referrerToken, db)
      userId = randomUUID()
      await db('User').insert({
        id: userId,
        referrerId,
        fullname: [data.first_name, data.last_name].filter(Boolean).join(' '),
        status: 'active',
      })
    }
    const user = await db<UserRecord>('User').where('id', userId).first()
    if (!user || user.status !== 'active') {
      throw new Error('Доступ запрещён')
    }
    if (!account) {
      if (await db('TelegramAccount').where({ userId }).first()) {
        throw new Error('У пользователя уже есть Telegram')
      }
      await db('TelegramAccount').insert({
        id: randomUUID(),
        externalKey: data.id,
        userId,
        username: data.username ?? null,
        photo_url: data.photo_url ?? null,
      })
    }
    return { success: true, message: null, token: await createToken(user, db) }
  })
}
builder.mutationField('authViaTelegram', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      tgAuthData: t.arg({ type: TelegramAuthDataInput, required: true }),
    },
    resolve: (_root, { tgAuthData }, ctx) => authViaTelegram(tgAuthData, ctx),
  }),
)
