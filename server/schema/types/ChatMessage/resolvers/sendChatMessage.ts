import { builder } from '../../../builder'
import { ChatMessageSendDataInput } from '../inputs'
import { ChatTokenUsage } from '../types'
import { proxyChat, type ChatResponse } from '../helpers/proxyChat'

const ChatResponseType = builder
  .objectRef<ChatResponse>('ChatResponse')
  .implement({
    fields: (t) => ({
      id: t.exposeString('id', { nullable: false }),
      success: t.exposeBoolean('success', { nullable: false }),
      content: t.exposeString('content', { nullable: false }),
      usage: t.field({
        type: ChatTokenUsage,
        nullable: false,
        resolve: (result) => result.usage,
      }),
    }),
  })

builder.mutationField('sendChatMessage', (t) =>
  t.field({
    type: ChatResponseType,
    nullable: false,
    args: { data: t.arg({ type: ChatMessageSendDataInput, required: true }) },
    resolve: (_root, { data }, ctx) => proxyChat(data, ctx.req),
  }),
)
