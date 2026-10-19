import { chatErrorMessage } from '../../app/Custom/components/Chat/lib/errors'
import { llmClient } from '../llm/client'
import express, { type Express, type Request, type Response } from 'express'
import { logDevError } from '../errorLogging'
import { collectToolCalls } from './toolCalls'
import { prepareTool, toolDefinitions } from './tools/registry'
import { parsePageUrl } from './pageContext'
import { buildSystemMessage } from './systemMessage'
import { createChatMessages } from './messages'
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
  const chatMessages = createChatMessages(storage)
  let active = 0
  const busy = new Set<string>()
  app.post(
    '/api/chat',
    express.json({ limit: '256kb' }),
    async (req: Request, res: Response): Promise<void> => {
      res.setHeader('Cache-Control', 'no-store, no-transform')
      let chatId: string | null
      let authStatus = 401
      try {
        const authorization = req.headers.authorization
        if (!authorization?.trim() || /^Bearer\s*$/i.test(authorization)) {
          throw new Error('Не был получен токен')
        }
        authStatus = 503
        chatId = await storage.verify(authorization)
        authStatus = 401
        if (!chatId) {
          throw new Error('Недействительный токен чата')
        }
      } catch (error) {
        logDevError('chat.verify', error)
        res.status(authStatus).json({
          error: chatErrorMessage(error, 'Не удалось проверить токен чата'),
        })
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
      if (
        req.body.stream !== undefined &&
        typeof req.body.stream !== 'boolean'
      ) {
        res.status(400).json({ error: 'Некорректный режим ответа' })
        return
      }
      const stream: boolean = req.body.stream ?? true
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
        if (!stream) {
          return
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
        await chatMessages.receive(
          chatId,
          message,
          req.get('origin') ||
            `${req.protocol}://${req.get('host') || 'unknown'}`,
        )
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
            content: buildSystemMessage(),
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
              stream,
              ...(stream ? { stream_options: { include_usage: true } } : {}),
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
            !upstream.headers
              .get('content-type')
              ?.includes(stream ? 'text/event-stream' : 'application/json')
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
                new Error(
                  stream
                    ? 'Провайдер не вернул потоковый ответ'
                    : 'Провайдер не вернул JSON-ответ',
                ),
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
            publicError = stream
              ? 'Провайдер не вернул потоковый ответ'
              : 'Провайдер не вернул JSON-ответ'
            if (responseBody) {
              try {
                publicError = chatErrorMessage(
                  JSON.parse(responseBody) as unknown,
                  publicError,
                )
              } catch {
                if (
                  upstream.headers.get('content-type')?.includes('text/plain')
                ) {
                  publicError = responseBody
                }
              }
            }
            throw new Error(publicError)
          }
          if (stream && !res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            res.setHeader('X-Accel-Buffering', 'no')
            res.flushHeaders()
          }
          stage = stream ? 'provider_stream' : 'provider_json'
          const roundUsage: TokenUsage = {}
          let roundContent = ''
          const calls: ToolCall[] = []
          let receivedId = false
          const onMetadata = (metadata: { id?: string }): void => {
            if (
              !receivedId &&
              metadata.id &&
              /^[a-zA-Z0-9_.:-]{1,256}$/.test(metadata.id)
            ) {
              answerId = metadata.id
              receivedId = true
            }
          }
          const onUsage = (value: unknown): void => {
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
          }
          const appendContent = async (content: string): Promise<void> => {
            roundContent += content
            answer += content
            if (answer.length > 64000) {
              throw new Error('Ответ слишком длинный')
            }
            await write(JSON.stringify({ choices: [{ delta: { content } }] }))
          }
          if (stream) {
            for await (const content of readCompletionStream(
              upstream.body,
              onMetadata,
              (delta) => collectToolCalls(calls, delta),
              onUsage,
            )) {
              await appendContent(content)
            }
          } else {
            responseBody = await upstream.text()
            const result: unknown = JSON.parse(responseBody)
            if (!result || typeof result !== 'object') {
              throw new Error('Некорректный ответ модели')
            }
            if ('error' in result && result.error) {
              throw new Error(
                chatErrorMessage(result.error, 'Ошибка при генерации ответа'),
                {
                  cause: result.error,
                },
              )
            }
            onMetadata({
              id:
                'id' in result && typeof result.id === 'string'
                  ? result.id
                  : undefined,
            })
            onUsage('usage' in result ? result.usage : undefined)
            const choice: unknown =
              'choices' in result && Array.isArray(result.choices)
                ? result.choices[0]
                : undefined
            if (
              !choice ||
              typeof choice !== 'object' ||
              !('message' in choice) ||
              !choice.message ||
              typeof choice.message !== 'object'
            ) {
              throw new Error('Некорректный ответ модели')
            }
            if ('finish_reason' in choice && choice.finish_reason === 'error') {
              throw new Error('Ответ модели прерван', { cause: result })
            }
            const message = choice.message
            if (
              'tool_calls' in message &&
              message.tool_calls !== null &&
              message.tool_calls !== undefined
            ) {
              if (!Array.isArray(message.tool_calls)) {
                throw new Error('Некорректные вызовы инструментов')
              }
              collectToolCalls(
                calls,
                message.tool_calls.map((call: unknown, index: number) => {
                  if (
                    !call ||
                    typeof call !== 'object' ||
                    !('type' in call) ||
                    call.type !== 'function'
                  ) {
                    throw new Error('Некорректный вызов инструмента')
                  }
                  return { ...call, index }
                }),
              )
            }
            const content = 'content' in message ? message.content : undefined
            if (typeof content === 'string') {
              await appendContent(content)
            } else if (
              (content !== null && content !== undefined) ||
              !calls.length
            ) {
              throw new Error('Некорректное содержимое ответа модели')
            }
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
        stage = stream ? 'finish_stream' : 'finish_json'
        if (stream) {
          await write(
            JSON.stringify({
              id: answerId,
              usage: {
                prompt_tokens: usage.inputTokens,
                prompt_tokens_details: { cached_tokens: usage.cachedTokens },
                completion_tokens: usage.outputTokens,
              },
              choices: [],
            }),
          )
          await write('[DONE]')
          res.end()
        } else {
          res.json({ id: answerId, success: true, content: answer, usage })
        }
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
        const errorMessage = chatErrorMessage(error, publicError)
        if (!res.destroyed) {
          if (res.headersSent) {
            res.end(
              `data: ${JSON.stringify({ id: answerId, success: false, error: { message: errorMessage } })}\n\n`,
            )
          } else {
            res
              .status(failureStatus)
              .json({ error: errorMessage, id: answerId, success: false })
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
