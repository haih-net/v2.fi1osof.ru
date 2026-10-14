import { builder } from '../../builder'
import type { StringFilter } from './interfaces'

export const UserStatusEnum = builder.enumType('UserStatusEnum', {
  values: ['newbie', 'active', 'blocked'] as const,
})
const QueryModeEnum = builder.enumType('QueryModeEnum', {
  values: ['default', 'insensitive'] as const,
})
const NestedStringNullableFilter = builder.inputRef<StringFilter>(
  'NestedStringNullableFilter',
)
const stringFields = (
  t: Parameters<Parameters<typeof builder.inputType>[1]['fields']>[0],
) => ({
  equals: t.string(),
  in: t.stringList(),
  notIn: t.stringList(),
  lt: t.string(),
  lte: t.string(),
  gt: t.string(),
  gte: t.string(),
  contains: t.string(),
  startsWith: t.string(),
  endsWith: t.string(),
  mode: t.field({ type: QueryModeEnum }),
  not: t.field({ type: NestedStringNullableFilter }),
})
NestedStringNullableFilter.implement({ fields: stringFields })
const StringNullableFilter = builder
  .inputRef<StringFilter>('StringNullableFilter')
  .implement({ fields: stringFields })

export const UserWhereUniqueInput = builder.inputType('UserWhereUniqueInput', {
  fields: (t) => ({ id: t.string(), email: t.string(), username: t.string() }),
})
export const UserWhereInput = builder.inputType('UserWhereInput', {
  fields: (t) => ({
    id: t.string(),
    email: t.string(),
    status: t.field({ type: UserStatusEnum }),
    isAiAgent: t.boolean(),
    username: t.field({ type: StringNullableFilter }),
    fullname: t.field({ type: StringNullableFilter }),
    intro: t.field({ type: StringNullableFilter }),
    content: t.field({ type: StringNullableFilter }),
    image: t.field({ type: StringNullableFilter }),
  }),
})
export type UserWhere = typeof UserWhereInput.$inferInput
export type UserWhereUnique = typeof UserWhereUniqueInput.$inferInput
export const AuthPayload = builder.simpleObject('AuthPayload', {
  fields: (t) => ({
    success: t.boolean(),
    message: t.string({ nullable: true }),
    token: t.string({ nullable: true }),
  }),
})
export const UserSigninDataInput = builder.inputType('UserSigninDataInput', {
  fields: (t) => ({ password: t.string({ required: true }) }),
})
export const CurrentUserUpdateInput = builder.inputType(
  'CurrentUserUpdateInput',
  {
    fields: (t) => ({
      username: t.string(),
      fullname: t.string(),
      password: t.string(),
      image: t.string(),
      content: t.string(),
      intro: t.string(),
      isAiAgent: t.boolean(),
    }),
  },
)
export const UserUpdateDataInput = builder.inputType('UserUpdateDataInput', {
  fields: (t) => ({
    status: t.field({ type: UserStatusEnum }),
    password: t.string(),
  }),
})
