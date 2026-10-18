import { builder } from '../../builder'

export const chatMessageArgs = builder.args((t) => ({
  chatId: t.string({ required: true }),
  token: t.string(),
  messageId: t.string({ required: true }),
}))
