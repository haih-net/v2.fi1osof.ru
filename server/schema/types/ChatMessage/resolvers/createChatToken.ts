import { logDevError } from '../../../../errorLogging'
import { builder } from '../../../builder'
import { chatStorage } from '../../../../chat/storage'

builder.mutationField('createChatToken', (t) =>
  t.string({
    nullable: false,
    resolve: async (): Promise<string> => {
      try {
        return await chatStorage.issue()
      } catch (error) {
        logDevError('chat.create_token', error)
        throw new Error('Не удалось создать чат', { cause: error })
      }
    },
  }),
)
