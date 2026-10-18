import type { Context } from 'server/schema/builder'

export function isActive(ctx: Context): boolean {
  return ctx.currentUser?.status === 'active'
}
