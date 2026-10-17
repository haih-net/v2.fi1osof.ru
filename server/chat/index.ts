import { llmClient } from '../llm/client'
import express, { type Express, type Request, type Response } from 'express'
import { logDevError } from '../errorLogging'
import { collectToolCalls } from './toolCalls'
import { prepareTool, toolDefinitions } from './tools/registry'
import { parsePageUrl } from './pageContext'
import { buildSystemMessage } from './systemMessage'
import type { ProviderMessage, ToolCall } from './types'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { readCompletionStream } from '../../app/Custom/components/Chat/lib/completionStream'

import {
  ChatStorage,
  chatStorage,
  contextMessages,
  type StoredMessage,
  type TokenUsage,
} from './storage'

export const setupChat = (
  app: Express,
  storage: ChatStorage = chatStorage,
): void => {
  let active = 0
  const busy = new Set<string>()
  app.post(
    '/api/chat',
    express.json({ limit: '256kb' }),
    async (req: Request, res: Response): Promise<void> => {
      res.setHeader('Cache-Control', 'no-store, no-transform')
      let chatId: string | null
      try {
        chatId = await storage.verify(req.headers.authorization)
      } catch (error) {
        logDevError('chat.verify', error)
        res.status(503).json({ error: 'Хранилище чатов недоступно' })
        return
      }
      if (!chatId) {
        res.status(401).json({ error: 'Недействительный токен чата' })
        return
      }
      if (
        typeof req.body?.message !== 'string' ||
        !req.body.message.trim() ||
        req.body.message.length > 16000
      ) {
        res.status(400).json({ error: 'Некорректное сообщение' })
        return
      }
      const pageUrl = parsePageUrl(req.get('X-Chat-Page-Url'))
      const message: StoredMessage = {
        pageUrl,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        role: 'user',
        success: true,
        content: req.body.message.trim(),
      }
      const key = process.env.CHAT_API_KEY
      const model = process.env.CHAT_MODEL
      const rejected = busy.has(chatId) ? 409 : active >= 8 ? 429 : undefined
      const ownsSlot = rejected === undefined
      if (ownsSlot) {
        active += 1
        busy.add(chatId)
      }
      const controller = new AbortController()
      let abortReason: 'timeout' | 'disconnect' | undefined
      const timeout = setTimeout(() => {
        abortReason = 'timeout'
        controller.abort(
          new Error('Истёк таймаут запроса к модели (120 секунд)'),
        )
      }, 120000)
      const disconnect = (): void => {
        abortReason ??= 'disconnect'
        controller.abort(new Error('Клиент закрыл соединение'))
      }
      res.on('close', disconnect)
      const write = async (data: string): Promise<void> => {
        if (controller.signal.aborted) {
          throw new Error('Запрос отменён')
        }
        if (!res.write(`data: ${data}\n\n`)) {
          await once(res, 'drain', { signal: controller.signal })
        }
      }
      let stage = 'save_user_message'
      let userSaved = false
      let answerSaved = false
      let failureStatus = 502
      let publicError = 'Не удалось связаться с моделью'
      const usage: TokenUsage = {}
      let answer = ''
      let answerId: string = randomUUID()
      const answerCreatedAt = new Date().toISOString()
      let responseBody: string | undefined
      let providerUrl: string | undefined
      let providerStatus: number | undefined
      let providerRequestId: string | null = null
      try {
        await storage.append(chatId, message)
        userSaved = true
        if (rejected) {
          failureStatus = rejected
          publicError =
            rejected === 409
              ? 'Дождитесь завершения предыдущего ответа'
              : 'Помощник занят'
          throw new Error(publicError)
        }
        if (!key || !model) {
          logDevError('chat.configuration', new Error('Помощник не настроен'), {
            chatId,
            messageId: message.id,
            missing: [!key && 'CHAT_API_KEY', !model && 'CHAT_MODEL'].filter(
              Boolean,
            ),
          })
          failureStatus = 503
          publicError = 'Помощник пока не настроен'
          throw new Error(publicError)
        }
        stage = 'read_history'
        const history = await storage.read(chatId)
        const messages = contextMessages(history, message)
        stage = 'provider_url'
        providerUrl = llmClient.endpoint
        const conversation: ProviderMessage[] = [
          {
            role: 'system',
            content: buildSystemMessage(undefined, pageUrl),
          },
          ...messages.map(({ role, content }) => ({
            role: role as 'user' | 'assistant',
            content,
          })),
        ]
        for (let round = 0; round < 9; round += 1) {
          stage = 'provider_request'
          providerStatus = undefined
          providerRequestId = null
          responseBody = undefined
          const upstream = await llmClient.complete(
            {
              model,
              stream: true,
              stream_options: { include_usage: true },
              messages: conversation,
              tools: toolDefinitions,
              tool_choice: round === 8 ? 'none' : 'auto',
            },
            controller.signal,
          )
          providerStatus = upstream.status
          providerRequestId =
            upstream.headers.get('x-request-id') ??
            upstream.headers.get('request-id')
          if (
            !upstream.ok ||
            !upstream.body ||
            !upstream.headers.get('content-type')?.includes('text/event-stream')
          ) {
            try {
              responseBody = await upstream.text()
            } catch (error) {
              logDevError('chat.provider_body', error, {
                chatId,
                messageId: message.id,
                providerStatus,
              })
            }
            if (process.env.NODE_ENV === 'development') {
              logDevError(
                'chat.provider_response',
                new Error('Провайдер не вернул потоковый ответ'),
                {
                  chatId,
                  messageId: message.id,
                  model,
                  providerUrl,
                  status: upstream.status,
                  statusText: upstream.statusText,
                  contentType: upstream.headers.get('content-type'),
                  providerRequestId,
                  responseBody,
                },
              )
            }
            failureStatus = upstream.status === 429 ? 429 : 502
            publicError = 'Провайдер не вернул потоковый ответ'
            throw new Error(publicError)
          }
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            res.setHeader('X-Accel-Buffering', 'no')
            res.flushHeaders()
          }
          stage = 'provider_stream'
          const roundUsage: TokenUsage = {}
          let roundContent = ''
          const calls: ToolCall[] = []
          let receivedId = false
          for await (const content of readCompletionStream(
            upstream.body,
            (metadata) => {
              if (
                !receivedId &&
                metadata.id &&
                /^[a-zA-Z0-9_.:-]{1,256}$/.test(metadata.id)
              ) {
                answerId = metadata.id
                receivedId = true
              }
            },
            (delta) => collectToolCalls(calls, delta),
            (value) => {
              if (!value || typeof value !== 'object') {
                return
              }
              const raw = value as Record<string, unknown>
              const details = raw.prompt_tokens_details
              const counters: Record<keyof TokenUsage, unknown> = {
                inputTokens: raw.prompt_tokens,
                cachedTokens:
                  details &&
                  typeof details === 'object' &&
                  'cached_tokens' in details
                    ? details.cached_tokens
                    : undefined,
                outputTokens: raw.completion_tokens,
              }
              for (const key of Object.keys(counters) as (keyof TokenUsage)[]) {
                const count = counters[key]
                if (
                  typeof count !== 'number' ||
                  !Number.isSafeInteger(count) ||
                  count < 0
                ) {
                  continue
                }
                usage[key] = (usage[key] ?? 0) + count - (roundUsage[key] ?? 0)
                roundUsage[key] = count
              }
            },
          )) {
            roundContent += content
            answer += content
            if (answer.length > 64000) {
              throw new Error('Ответ слишком длинный')
            }
            await write(JSON.stringify({ choices: [{ delta: { content } }] }))
          }
          if (controller.signal.aborted) {
            throw new Error('Запрос отменён')
          }
          if (!calls.length) {
            break
          }
          if (round === 8 || Array.from(calls).some((call) => !call?.id)) {
            throw new Error('Invalid or excessive tool calls')
          }
          conversation.push({
            role: 'assistant',
            content: roundContent || null,
            tool_calls: calls,
          })
          for (const call of calls) {
            stage = 'tool_call'
            await storage.append(chatId, {
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              role: 'tool_call',
              success: true,
              replyToId: message.id,
              content: JSON.stringify(
                {
                  ...call,
                  function: {
                    ...call.function,
                    arguments: (() => {
                      try {
                        return JSON.parse(call.function.arguments) as unknown
                      } catch {
                        return call.function.arguments
                      }
                    })(),
                  },
                },
                null,
                2,
              ),
            })
            let result: string
            try {
              const tool = prepareTool(call)
              const explanation = `\n\n${tool.reasoning.trim()}\n\n`
              if (answer.length + explanation.length > 64000) {
                throw new Error('Answer is too long')
              }
              answer += explanation
              await write(
                JSON.stringify({
                  choices: [{ delta: { content: explanation } }],
                }),
              )
              result = await tool.execute({
                endpoint: `http://127.0.0.1:${req.socket.localPort}/api`,
                signal: controller.signal,
                pageUrl,
              })
            } catch (error) {
              logDevError('chat.tool', error, { chatId, toolCallId: call.id })
              result = JSON.stringify({
                error: error instanceof Error ? error.message : 'Tool failed',
              })
            }
            await storage.append(chatId, {
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              role: 'tool',
              success:
                !JSON.parse(result).error && !JSON.parse(result).errors?.length,
              replyToId: message.id,
              content: JSON.stringify(
                { toolCallId: call.id, result: JSON.parse(result) as unknown },
                null,
                2,
              ),
            })
            if (controller.signal.aborted) {
              throw new Error('Request cancelled')
            }
            conversation.push({
              role: 'tool',
              tool_call_id: call.id,
              content: result,
            })
          }
        }
        stage = 'save_assistant_message'
        await storage.append(chatId, {
          id: answerId,
          createdAt: answerCreatedAt,
          role: 'assistant',
          success: true,
          replyToId: message.id,
          content: answer,
          usage,
        })
        answerSaved = true
        stage = 'finish_stream'
        await write('[DONE]')
        res.end()
      } catch (error) {
        logDevError('chat.request', error, {
          chatId,
          messageId: message.id,
          stage,
          model,
          providerUrl,
          providerStatus,
          providerRequestId,
          abortReason,
          headersSent: res.headersSent,
          usage,
        })
        if (userSaved && !answerSaved) {
          try {
            await storage.append(chatId, {
              id: answerId,
              createdAt: answerCreatedAt,
              role: 'assistant',
              replyToId: message.id,
              success: false,
              usage,
              content: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  cause: error instanceof Error ? error.cause : undefined,
                  stage,
                  providerStatus,
                  providerRequestId,
                  responseBody,
                  abortReason,
                  partialAnswer: answer || undefined,
                },
                null,
                2,
              ),
            })
          } catch (storageError) {
            logDevError('chat.save_error', storageError, {
              chatId,
              messageId: message.id,
              answerId,
            })
          }
        }
        if (!res.destroyed) {
          if (res.headersSent) {
            res.end(
              `data: ${JSON.stringify({ id: answerId, success: false, error: { message: 'Ответ прерван. Попробуйте ещё раз.' } })}\n\n`,
            )
          } else {
            res
              .status(failureStatus)
              .json({ error: publicError, id: answerId, success: false })
          }
        }
      } finally {
        clearTimeout(timeout)
        res.off('close', disconnect)
        controller.abort()
        if (ownsSlot) {
          active -= 1
          busy.delete(chatId)
        }
      }
    },
  )
}
