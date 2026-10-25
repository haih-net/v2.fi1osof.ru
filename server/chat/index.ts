import type { Knex } from 'knex'
import express, { type Express, type Request, type Response } from 'express'
import { logDevError } from '../errorLogging'
import { ChatStorage, chatStorage } from './storage'
import { createChatMessages } from './messages'
import { parsePageUrl } from './pageContext'
import { ChatAgent } from './agent/ChatAgent'
import { createAgentContext } from './agent/context'
import { createChatResponse } from './http/response'

type setupChatProps = {
  app: Express
  usersDatabase: Knex
  storage: ChatStorage | undefined
}

export const setupChat = ({
  app,
  usersDatabase,
  storage = chatStorage,
}: setupChatProps): void => {
  const chatMessages = createChatMessages({
    storage,
    usersDatabase,
    sendNotify: undefined,
  })
  const agent = new ChatAgent()
  app.post(
    '/api/chat',
    express.json({ limit: '256kb' }),
    async (req: Request, res: Response): Promise<void> => {
      res.setHeader('Cache-Control', 'no-store, no-transform')
      let chatId: string | undefined
      const token = req.get('dialog-token')
      if (
        typeof req.body?.message !== 'string' ||
        !req.body.message.trim() ||
        req.body.message.length > 16000
      ) {
        res.status(400).json({ error: 'Некорректное сообщение' })
        return
      }
      if (
        req.body.stream !== undefined &&
        typeof req.body.stream !== 'boolean'
      ) {
        res.status(400).json({ error: 'Некорректный режим ответа' })
        return
      }
      const stream: boolean = req.body.stream ?? true
      const pageUrl = parsePageUrl(req.get('X-Chat-Page-Url'))
      const origin =
        req.get('origin') || `${req.protocol}://${req.get('host') || 'unknown'}`
      const controller = new AbortController()
      const disconnect = (): void =>
        controller.abort(new Error('Клиент закрыл соединение'))
      res.on('close', disconnect)
      const delivery = createChatResponse(res, stream, controller.signal)
      try {
        const context = createAgentContext({
          storage,
          pageUrl,
          authorization: req.headers.authorization,
          signal: controller.signal,
          endpoint: `http://127.0.0.1:${req.socket.localPort}/api`,
          receive: (message, context) =>
            chatMessages.receive(context.chatId, message, origin),
        })
        const result = await agent.run(req.body.message, token, context, {
          stream,
          onEvent: async (event, signal) => {
            if (event.type === 'authenticated') {
              chatId = event.chatId
            }
            await delivery.event(event, signal)
          },
          diagnostics: () => ({ headersSent: res.headersSent }),
        })
        try {
          await delivery.finish(result)
        } catch (error) {
          logDevError('chat.request', error, {
            chatId,
            answerId: result.id,
            stage: stream ? 'finish_stream' : 'finish_json',
            headersSent: res.headersSent,
            usage: result.usage,
          })
          throw error
        }
      } catch (error) {
        delivery.fail(error)
      } finally {
        res.off('close', disconnect)
        controller.abort()
      }
    },
  )
}
