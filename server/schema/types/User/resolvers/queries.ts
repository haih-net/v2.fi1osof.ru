import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { User } from '../types'
import { UserWhereInput, UserWhereUniqueInput } from '../inputs'
import { findUser, usersQuery } from '../helpers/queries'

builder.queryField('me', (t) =>
  t.field({
    type: User,
    nullable: true,
    resolve: (_root, _args, ctx) => ctx.currentUser,
  }),
)
builder.queryField('user', (t) =>
  t.field({
    type: User,
    nullable: true,
    args: { where: t.arg({ type: UserWhereUniqueInput, required: true }) },
    resolve: async (_root, { where }, ctx) =>
      (await findUser(ctx.db, where).first()) ?? null,
  }),
)
builder.queryField('users', (t) =>
  t.field({
    type: [User],
    args: {
      where: t.arg({ type: UserWhereInput }),
      skip: t.arg.int(),
      take: t.arg.int(),
    },
    resolve: (_root, { where, skip, take }, ctx) => {
      if (
        (skip !== null && skip !== undefined && skip < 0) ||
        (take !== null && take !== undefined && take < 0)
      ) {
        throw new GraphQLError('skip and take must be non-negative', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      const query = usersQuery(ctx.db, where, ctx.currentUser).orderBy(
        'createdAt',
        'desc',
      )
      if (skip !== null && skip !== undefined) {
        query.offset(skip)
      }
      if (take !== null && take !== undefined) {
        query.limit(take)
      }
      return query
    },
  }),
)
builder.queryField('usersCount', (t) =>
  t.int({
    args: { where: t.arg({ type: UserWhereInput }) },
    resolve: async (_root, { where }, ctx) => {
      const result = await usersQuery(ctx.db, where, ctx.currentUser).count<
        { count: string }[]
      >({ count: '*' })
      return Number(result[0]?.count ?? 0)
    },
  }),
)
