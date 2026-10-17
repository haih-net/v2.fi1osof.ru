import { builder } from 'server/schema/builder'
import { ChatMessageIndex } from '../types'
import { requireChatAdmin } from '../../ChatMessage/helpers/auth'
import { chatStorage } from 'server/chat/storage'

builder.queryField('chatMessageIndexes', (t) =>
  t.field({
    type: [ChatMessageIndex],
    nullable: false,
    resolve: async (_root, _args, ctx) => {
      requireChatAdmin(ctx)
      return chatStorage.listMessages()
    },
  }),
)
