import { builder } from '../../../builder'
import { chatStorage } from '../../../../chat/storage'
import { ChatMessage } from '../types'
import { chatMessageArgs } from '../inputs'
import { requireChatAccess, requireChatAdmin } from '../helpers/auth'
import { chatDialogueArgs } from '../../ChatDialogue/inputs'

builder.queryField('chatMessage', (t) =>
  t.field({
    type: ChatMessage,
    nullable: true,
    args: chatMessageArgs,
    resolve: async (_root, { chatId, messageId }, ctx) => {
      requireChatAdmin(ctx)
      const messages = await chatStorage.read(chatId)
      return messages.find((message) => message.id === messageId) ?? null
    },
  }),
)

builder.queryField('chatMessages', (t) =>
  t.field({
    type: [ChatMessage],
    nullable: false,
    args: chatDialogueArgs,
    resolve: async (_root, { chatId, token }, ctx) => {
      await requireChatAccess(ctx, chatId, token)
      const messages = await chatStorage.read(chatId)
      return ctx.currentUser?.sudo === true
        ? messages
        : messages.filter(({ role }) => role === 'user' || role === 'assistant')
    },
  }),
)
