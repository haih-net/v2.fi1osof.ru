import { GraphQLError } from 'graphql'
import type { Context } from '../builder'
import type { UserRecord } from '../types/User/interfaces'

export function authenticated(ctx: Context): UserRecord {
  if (!ctx.currentUser) {
    throw new GraphQLError('Не авторизован', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.currentUser
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
