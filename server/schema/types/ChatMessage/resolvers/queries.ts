import { builder } from '../../../builder'
import { chatStorage } from '../../../../chat/storage'
import { ChatMessage } from '../types'
import { chatMessageArgs } from '../inputs'
import { chatDialogueArgs } from '../../ChatDialogue/inputs'

builder.queryField('chatMessage', (t) =>
  t.field({
    authScopes: (_parent, { chatId, token }) => ({
      $any: { sudo: true, chatToken: { chatId, token } },
    }),
    type: ChatMessage,
    nullable: true,
    args: chatMessageArgs,
    resolve: async (_root, { chatId, messageId }, ctx) => {
      const messages = await chatStorage.read(chatId)
      return (
        messages.find(
          (message) =>
            message.id === messageId &&
            (ctx.currentUser?.sudo === true ||
              message.role === 'user' ||
              message.role === 'assistant'),
        ) ?? null
      )
    },
  }),
)

builder.queryField('chatMessages', (t) =>
  t.field({
    authScopes: (_parent, { chatId, token }) => ({
      $any: { sudo: true, chatToken: { chatId, token } },
    }),
    type: [ChatMessage],
    nullable: false,
    args: chatDialogueArgs,
    resolve: async (_root, { chatId }, ctx) => {
      const messages = await chatStorage.read(chatId)
      return ctx.currentUser?.sudo === true
        ? messages
        : messages.filter(({ role }) => role === 'user' || role === 'assistant')
    },
  }),
)
