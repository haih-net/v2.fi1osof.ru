import type { Context } from 'server/schema/builder'

/**
 * User is authenticated
 */
export function isAuthenticated(ctx: Context): boolean {
  return !!ctx.currentUser
}
