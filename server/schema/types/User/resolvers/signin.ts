import { builder } from '../../../builder'
import {
  AuthPayload,
  UserWhereUniqueInput,
  UserSigninDataInput,
} from '../inputs'
import { createToken, comparePassword } from '../helpers/auth'
import { findUser } from '../helpers/queries'

builder.mutationField('signin', (t) =>
  t.field({
    type: AuthPayload,
    args: {
      where: t.arg({ type: UserWhereUniqueInput, required: true }),
      data: t.arg({ type: UserSigninDataInput, required: true }),
    },
    resolve: async (_root, { where, data }, ctx) => {
      const failure = (message: string) => ({
        success: false,
        message,
        token: null,
      })
      if (!where.id && !where.email && !where.username) {
        return failure('Email, username or id required')
      }
      const user = await findUser(ctx.db, where).first()
      if (!user) {
        return failure('User not found')
      }
      if (!user.password) {
        return failure('Password not set')
      }
      if (!(await comparePassword(data.password, user.password))) {
        return failure('Invalid password')
      }
      return {
        success: true,
        message: null,
        token: await createToken(user, ctx.db),
      }
    },
  }),
)
