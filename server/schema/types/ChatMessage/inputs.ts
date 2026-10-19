import { builder } from '../../builder'
import { DialogueChannel } from '../ChatDialogue/types'

export const chatMessageArgs = builder.args((t) => ({
  chatId: t.string({ required: true }),
  token: t.string(),
  messageId: t.string({ required: true }),
}))

export const ChatMessageCreateTokenDataInput = builder.inputType(
  'ChatMessageCreateTokenDataInput',
  {
    fields: (t) => ({
      channel: t.field({ type: DialogueChannel, defaultValue: 'chat' }),
    }),
  },
)

export const ChatMessageSubmitFeedbackDataInput = builder.inputType(
  'ChatMessageSubmitFeedbackDataInput',
  {
    fields: (t) => ({
      token: t.string({ required: true }),
      contacts: t.string({ required: true }),
      message: t.string({ required: true }),
    }),
  },
)

export const ChatMessageSendDataInput = builder.inputType(
  'ChatMessageSendDataInput',
  {
    fields: (t) => ({
      token: t.string({ required: true }),
      message: t.string({ required: true }),
      pageUrl: t.string(),
    }),
  },
)
