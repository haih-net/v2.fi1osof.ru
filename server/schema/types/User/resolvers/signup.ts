import { builder, type Context } from '../../../builder'
import { AuthPayload, UserSignupDataInput } from '../inputs'
import { createToken } from '../helpers/auth'
import { checkReferrerToken } from '../helpers/checkReferrerToken'
import { insertUser } from '../helpers/insertUser'

export async function signup(
  data: typeof UserSignupDataInput.$inferInput,
  ctx: Context,
): Promise<{ success: boolean; message: string | null; token: string }> {
  if (ctx.currentUser) {
    throw new Error('Вы уже вошли в учётную запись')
  }
  const { referrerToken, ...profile } = data
  const referrerId = await checkReferrerToken(referrerToken, ctx.dbOld)
  return ctx.dbOld.transaction(async (db) => {
    const user = await insertUser(db, profile, referrerId)
    return { success: true, message: null, token: await createToken(user, db) }
  })
}
builder.mutationField('signup', (t) =>
  t.field({
    type: AuthPayload,
    args: { data: t.arg({ type: UserSignupDataInput, required: true }) },
    resolve: (_root, { data }, ctx) => signup(data, ctx),
  }),
)
