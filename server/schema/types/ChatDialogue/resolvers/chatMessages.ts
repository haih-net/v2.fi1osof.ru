import { builder } from 'server/schema/builder'
import { ChatMessageIndex } from '../types'
import { chatStorage } from 'server/chat/storage'

builder.queryField('chatMessageIndexes', (t) =>
  t.field({
    authScopes: { sudo: true },
    type: [ChatMessageIndex],
    nullable: false,
    resolve: async (_root, _args) => {
      return chatStorage.listMessages()
    },
  }),
)
