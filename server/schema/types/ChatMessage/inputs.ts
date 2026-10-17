import { builder } from '../../builder'

export const chatMessageArgs = builder.args((t) => ({
  chatId: t.string({ required: true }),
  messageId: t.string({ required: true }),
}))
