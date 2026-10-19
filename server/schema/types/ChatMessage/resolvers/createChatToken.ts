import { logDevError } from '../../../../errorLogging'
import { builder } from '../../../builder'
import { chatStorage } from '../../../../chat/storage'

import { ChatMessageCreateTokenDataInput } from '../inputs'

builder.mutationField('createChatToken', (t) =>
  t.string({
    nullable: false,
    args: {
      data: t.arg({ type: ChatMessageCreateTokenDataInput, required: true }),
    },
    resolve: async (_root, { data }): Promise<string> => {
      try {
        return await chatStorage.issue(data.channel ?? 'chat')
      } catch (error) {
        logDevError('chat.create_token', error)
        throw new Error('Не удалось создать чат', { cause: error })
      }
    },
  }),
)
