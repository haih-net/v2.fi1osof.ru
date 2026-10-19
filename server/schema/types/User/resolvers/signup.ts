import { randomUUID } from 'node:crypto'
import { builder, type Context } from '../../../builder'
import { AuthPayload, UserSignupDataInput } from '../inputs'
import { createToken, hashPassword } from '../helpers/auth'
import { checkReferrerToken } from '../helpers/checkReferrerToken'
import { validateRegistration } from '../helpers/validateRegistration'
import type { UserRecord, UserStatus } from '../interfaces'

export async function signup(
  data: typeof UserSignupDataInput.$inferInput,
  ctx: Context,
): Promise<{ success: boolean; message: string | null; token: string }> {
  if (ctx.currentUser) {
    throw new Error('Вы уже вошли в учётную запись')
  }
  const username = data.username?.trim() || null
  const email = data.email?.trim() || null
  const error = validateRegistration({
    username,
    email,
    password: data.password,
  })
  if (error) {
    throw new Error(error)
  }
  const status = process.env.USER_DEFAULT_STATUS || 'active'
  if (!['active', 'newbie', 'blocked'].includes(status)) {
    throw new Error('Некорректный USER_DEFAULT_STATUS')
  }
  const referrerId = await checkReferrerToken(data.referrerToken, ctx.dbOld)
  const password = await hashPassword(data.password)
  try {
    return await ctx.dbOld.transaction(async (db) => {
      const [user] = await db<UserRecord & { referrerId: string | null }>(
        'User',
      )
        .insert({
          id: randomUUID(),
          username,
          email,
          fullname: data.fullname?.trim() || null,
          password,
          status: status as UserStatus,
          referrerId,
          isAiAgent: data.isAiAgent ?? false,
          sudo: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning('*')
      return {
        success: true,
        message: null,
        token: await createToken(user, db),
      }
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: User.username')
    ) {
      throw new Error('Логин уже занят')
    }
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: User.email')
    ) {
      throw new Error('Электронная почта уже зарегистрирована')
    }
    throw error
  }
}
builder.mutationField('signup', (t) =>
  t.field({
    type: AuthPayload,
    args: { data: t.arg({ type: UserSignupDataInput, required: true }) },
    resolve: (_root, { data }, ctx) => signup(data, ctx),
  }),
)
