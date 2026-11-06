import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { User } from '../types'
import {
  CurrentUserUpdateInput,
  UserUpdateDataInput,
  UserWhereUniqueInput,
} from '../inputs'
import { profileChanges } from '../helpers/profileChanges'
import type { UserRecord } from '../interfaces'

builder.mutationField('updateCurrentUser', (t) =>
  t.field({
    authScopes: { active: true },
    type: User,
    nullable: true,
    args: { data: t.arg({ type: CurrentUserUpdateInput, required: true }) },
    resolve: async (_root, { data }, ctx) => {
      if (!ctx.currentUser) {
        throw new GraphQLError('Authorization required', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }
      const changes = await profileChanges(data)
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
    authScopes: { active: true, sudo: true },
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
      const { status, sudo, ...profile } = data
      const changes = await profileChanges(profile)
      if (status !== null && status !== undefined) {
        changes.status = status
      }
      if (sudo !== null && sudo !== undefined) {
        changes.sudo = sudo
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
