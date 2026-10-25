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
  const header = ctx.req?.headers?.['dialog-token']
  const dialogToken = token ?? (typeof header === 'string' ? header : undefined)
  const verifiedId = await chatStorage.verify(
    dialogToken ? `Bearer ${dialogToken}` : undefined,
  )
  return verifiedId !== null && verifiedId === chatId
}
