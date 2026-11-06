import { GraphQLError } from 'graphql'
import type { Context } from '../builder'
import type { UserRecordLegacy } from '../types/User/interfaces'

export function authenticated(ctx: Context): UserRecordLegacy {
  if (!ctx.currentUserLegacy) {
    throw new GraphQLError('Не авторизован', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.currentUserLegacy
}
export function requiredId(id: string | null | undefined): string {
  if (!id) {
    throw new GraphQLError('Не указан ID')
  }
  return id
}
export function nonempty(value: string): string {
  if (!value.trim()) {
    throw new GraphQLError('Заполните обязательное поле')
  }
  return value
}
