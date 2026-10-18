import { builder } from 'server/schema/builder'
import { chatStorage } from 'server/chat/storage'
import { ChatDialogue } from '../types'

builder.queryField('chatDialogues', (t) =>
  t.field({
    authScopes: { sudo: true },
    type: [ChatDialogue],
    nullable: false,
    resolve: async (_root, _args) => {
      return chatStorage.listDialogues()
    },
  }),
)
