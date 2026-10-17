import { builder } from '../../builder'
import type { Message, TokenUsage } from '../../../chat/storage'

export const ChatTokenUsage = builder
  .objectRef<TokenUsage>('ChatTokenUsage')
  .implement({
    fields: (t) => ({
      inputTokens: t.exposeFloat('inputTokens', { nullable: true }),
      cachedTokens: t.exposeFloat('cachedTokens', { nullable: true }),
      outputTokens: t.exposeFloat('outputTokens', { nullable: true }),
    }),
  })

export const ChatMessage = builder.objectRef<Message>('ChatMessage').implement({
  fields: (t) => ({
    usage: t.field({
      type: ChatTokenUsage,
      nullable: true,
      resolve: (message) => message.usage,
    }),
    id: t.exposeString('id', { nullable: true }),
    createdAt: t.exposeString('createdAt', { nullable: true }),
    role: t.exposeString('role', { nullable: false }),
    success: t.exposeBoolean('success', { nullable: true }),
    pageUrl: t.exposeString('pageUrl', { nullable: true }),
    replyToId: t.exposeString('replyToId', { nullable: true }),
    content: t.exposeString('content', { nullable: false }),
  }),
})
