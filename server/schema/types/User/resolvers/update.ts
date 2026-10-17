import { GraphQLError } from 'graphql'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import { builder } from '../../../builder'
import { User } from '../types'
import {
  CurrentUserUpdateInput,
  UserUpdateDataInput,
  UserWhereUniqueInput,
} from '../inputs'
import { hashPassword } from '../helpers/auth'
import type { UserRecord } from '../interfaces'

builder.mutationField('updateCurrentUser', (t) =>
  t.field({
    type: User,
    nullable: true,
    args: { data: t.arg({ type: CurrentUserUpdateInput, required: true }) },
    resolve: async (_root, { data }, ctx) => {
      if (!ctx.currentUser) {
        throw new GraphQLError('Authorization required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const { password, isAiAgent, ...profile } = data
      if (profile.content) {
        try {
          unified().use(remarkParse).use(remarkMdx).parse(profile.content)
        } catch {
          throw new GraphQLError('Invalid content', {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }
      }
      const changes: Partial<UserRecord> = { ...profile, updatedAt: new Date() }
      if (isAiAgent !== null && isAiAgent !== undefined) {
        changes.isAiAgent = isAiAgent
      }
      if (password) {
        changes.password = await hashPassword(password)
      }
      const [user] = await ctx
        .db<UserRecord>('User')
        .where('id', ctx.currentUser.id)
        .update(changes)
        .returning('*')
      return user ?? null
    },
  }),
)
builder.mutationField('updateUser', (t) =>
  t.field({
    type: User,
    nullable: true,
    args: {
      data: t.arg({ type: UserUpdateDataInput, required: true }),
      where: t.arg({ type: UserWhereUniqueInput, required: true }),
    },
    resolve: async (_root, { data, where }, ctx) => {
      if (!ctx.currentUser?.sudo) {
        throw new GraphQLError('Access denied', {
          extensions: { code: 'FORBIDDEN' },
        })
      }
      if (!where.id) {
        throw new GraphQLError('id did not provided', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      if (where.id === ctx.currentUser.id) {
        throw new GraphQLError('Can not update self account via this method', {
          extensions: { code: 'FORBIDDEN' },
        })
      }
      const changes: Partial<UserRecord> = { updatedAt: new Date() }
      if (data.status !== null && data.status !== undefined) {
        changes.status = data.status
      }
      if (data.password) {
        changes.password = await hashPassword(data.password)
      }
      const [user] = await ctx
        .db<UserRecord>('User')
        .where('id', where.id)
        .update(changes)
        .returning('*')
      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      return user
    },
  }),
)
