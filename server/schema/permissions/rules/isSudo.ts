import type { Context } from 'server/schema/builder'

export function isSudo(ctx: Context): boolean {
  return ctx.currentUser?.sudo === true
}
