import { builder } from '../../../builder'
import { UserCreateDataInput } from '../inputs'
import { insertUser } from '../helpers/insertUser'
import { User } from '../types'

builder.mutationField('createUser', (t) =>
  t.field({
    authScopes: { $all: { active: true, sudo: true } },
    type: User,
    args: { data: t.arg({ type: UserCreateDataInput, required: true }) },
    resolve: (_root, { data }, ctx) => insertUser(ctx.db, data),
  }),
)
