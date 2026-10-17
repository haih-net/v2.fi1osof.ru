import { builder } from 'server/schema/builder'
import { chatStorage } from 'server/chat/storage'
import { ChatDialogue } from '../types'
import { requireChatAdmin } from '../../ChatMessage/helpers/auth'

builder.queryField('chatDialogues', (t) =>
  t.field({
    type: [ChatDialogue],
    nullable: false,
    resolve: async (_root, _args, ctx) => {
      requireChatAdmin(ctx)
      return chatStorage.listDialogues()
    },
  }),
)
