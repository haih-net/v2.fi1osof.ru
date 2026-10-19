import { ChatTokenUsage } from '../ChatMessage/types'
import { builder } from '../../builder'
import type { DialogueIndex, MessageIndex } from '../../../chat/storage'

export const ChatMessageIndex = builder
  .objectRef<MessageIndex>('ChatMessageIndex')
  .implement({
    fields: (t) => ({
      usage: t.field({
        type: ChatTokenUsage,
        nullable: true,
        resolve: (message) => message.usage,
      }),
      id: t.exposeString('id', { nullable: false }),
      success: t.exposeBoolean('success', { nullable: true }),
      pageUrl: t.exposeString('pageUrl', { nullable: true }),
      status: t.exposeString('status', { nullable: false }),
      chatId: t.exposeString('chatId', { nullable: false }),
      createdAt: t.exposeString('createdAt', { nullable: false }),
      role: t.exposeString('role', { nullable: false }),
    }),
  })

export const ChatDialogue = builder
  .objectRef<DialogueIndex>('ChatDialogue')
  .implement({
    fields: (t) => ({
      channel: t.exposeString('channel', { nullable: false }),
      chatId: t.exposeString('chatId', { nullable: false }),
      createdAt: t.exposeString('createdAt', { nullable: false }),
    }),
  })

export const DialogueChannel = builder.enumType('DialogueChannel', {
  values: ['chat', 'feedback'] as const,
})
