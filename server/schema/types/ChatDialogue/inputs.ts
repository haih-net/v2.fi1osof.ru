import { builder } from 'server/schema/builder'

export const chatDialogueArgs = builder.args((t) => ({
  chatId: t.string({ required: true }),
  token: t.string(),
}))
