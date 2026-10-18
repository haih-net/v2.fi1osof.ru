import type { Context } from 'server/schema/builder'
import { chatStorage } from 'server/chat/storage'

export interface ChatAccessArgs {
  chatId: string
  token?: string | null
}

export async function hasChatToken(
  { chatId, token }: ChatAccessArgs,
  ctx: Context,
): Promise<boolean> {
  const verifiedId = await chatStorage.verify(
    token ? `Bearer ${token}` : ctx.req?.headers?.authorization,
  )
  return verifiedId !== null && verifiedId === chatId
}
