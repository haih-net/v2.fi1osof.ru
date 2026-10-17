import type { Context } from '../../../builder'
import { chatStorage } from '../../../../chat/storage'

export function requireChatAdmin(ctx: Context): void {
  if (ctx.currentUser?.sudo !== true) {
    throw new Error('Доступ запрещён')
  }
}

export async function requireChatAccess(
  ctx: Context,
  chatId: string,
  token: string | null | undefined,
): Promise<void> {
  if (ctx.currentUser?.sudo !== true) {
    const verifiedId = await chatStorage.verify(
      token ? `Bearer ${token}` : ctx.req.headers.authorization,
    )
    if (!verifiedId || verifiedId !== chatId) {
      throw new Error('Доступ запрещён')
    }
  }
}
