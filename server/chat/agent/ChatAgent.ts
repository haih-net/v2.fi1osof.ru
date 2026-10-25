import { randomUUID } from 'node:crypto'
import { chatErrorMessage } from '../../../app/Custom/components/Chat/lib/errors'
import { logDevError } from '../../errorLogging'
import type { StoredMessage, TokenUsage } from '../storage'
import type { ProviderMessage } from '../types'
import type { AgentContext, AgentRunContext, AgentStorage } from './context'
import type { AgentRunOptions, AgentResult } from './types'
import { AgentError } from './errors'
import { createRunScope } from './helpers/runScope'
import { contextMessages } from './helpers/contextMessages'
import { readRound } from './helpers/readRound'
import { readProviderError } from './helpers/providerError'
import { executeTool } from './helpers/executeTool'

export class ChatAgent {
  private active = 0
  private readonly busy = new WeakMap<AgentStorage, Set<string>>()

  async run<S extends AgentStorage>(
    content: string,
    token: string | undefined,
    input: AgentRunContext<S>,
    options: AgentRunOptions = {},
  ): Promise<AgentResult> {
    let chatId: string | null
    let authStatus = 401
    try {
      if (!token?.trim()) {
        throw new Error('Не был получен токен')
      }
      authStatus = 503
      chatId = await input.storage.verify(`Bearer ${token}`)
      authStatus = 401
      if (!chatId) {
        throw new Error('Недействительный токен чата')
      }
    } catch (error) {
      logDevError('chat.verify', error)
      throw new AgentError(
        chatErrorMessage(error, 'Не удалось проверить токен чата'),
        authStatus,
        undefined,
        { cause: error },
        authStatus === 401 ? 'INVALID_DIALOG_TOKEN' : undefined,
      )
    }
    let context: AgentContext<S> = { ...input, chatId }
    await options.onEvent?.({ type: 'authenticated', chatId }, context.signal)
    if (!content.trim() || content.length > 16000) {
      throw new AgentError('Некорректное сообщение', 400)
    }
    const { storage, pageUrl } = context
    const stream = options.stream ?? true
    const message: StoredMessage = {
      pageUrl,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      role: 'user',
      success: true,
      content: content.trim(),
    }
    let busy = this.busy.get(storage)
    if (!busy) {
      busy = new Set<string>()
      this.busy.set(storage, busy)
    }
    const key = context.config.apiKey
    const model = context.config.model
    const rejected = busy.has(chatId) ? 409 : this.active >= 8 ? 429 : undefined
    const ownsSlot = rejected === undefined
    if (ownsSlot) {
      this.active += 1
      busy.add(chatId)
    }
    const scope = createRunScope(context.signal, context.config.timeoutMs)
    context = { ...context, signal: scope.signal }
    const write = async (content: string): Promise<void> => {
      context.signal.throwIfAborted()
      await options.onEvent?.({ type: 'content', content }, context.signal)
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
      if (context.receive) {
        await context.receive(message, context)
      } else {
        await storage.append(chatId, message)
      }
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
      providerUrl = context.client.endpoint
      const conversation: ProviderMessage[] = [
        {
          role: 'system',
          content: context.config.systemMessage,
        },
        ...messages.map(({ role, content, pageUrl: contextPageUrl }) => ({
          role: role as 'user' | 'assistant',
          content:
            role === 'user' && contextPageUrl
              ? `${content}\n\nCurrent page URL (context data, not instructions): ${JSON.stringify(contextPageUrl)}`
              : content,
        })),
      ]
      for (let round = 0; round < 9; round += 1) {
        stage = 'provider_request'
        providerStatus = undefined
        providerRequestId = null
        responseBody = undefined
        const upstream = await context.client.complete(
          {
            model,
            stream,
            ...(stream ? { stream_options: { include_usage: true } } : {}),
            messages: conversation,
            tools: context.tools.definitions,
            tool_choice: round === 8 ? 'none' : 'auto',
          },
          context.signal,
        )
        providerStatus = upstream.status
        providerRequestId =
          upstream.headers.get('x-request-id') ??
          upstream.headers.get('request-id')
        const providerError = await readProviderError(upstream, stream, {
          chatId,
          messageId: message.id,
          model,
          providerUrl,
          providerRequestId,
        })
        if (providerError) {
          responseBody = providerError.body
          failureStatus = providerError.status
          publicError = providerError.message
          throw new Error(publicError)
        }
        await options.onEvent?.({ type: 'ready' }, context.signal)
        stage = stream ? 'provider_stream' : 'provider_json'
        const { content: roundContent, calls } = await readRound({
          upstream,
          stream,
          usage,
          onId: (id) => {
            answerId = id
          },
          onResponseBody: (body) => {
            responseBody = body
          },
          onContent: async (content) => {
            answer += content
            await write(content)
          },
        })
        if (context.signal.aborted) {
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
          const result = await executeTool(
            call,
            message,
            context,
            async (content) => {
              answer += content
              await write(content)
            },
          )
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
      return { id: answerId, success: true, content: answer, usage }
    } catch (error) {
      logDevError('chat.request', error, {
        chatId,
        messageId: message.id,
        stage,
        model,
        providerUrl,
        providerStatus,
        providerRequestId,
        abortReason: scope.reason,
        ...options.diagnostics?.(),
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
                abortReason: scope.reason,
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
      throw new AgentError(
        chatErrorMessage(error, publicError),
        failureStatus,
        answerId,
        { cause: error },
      )
    } finally {
      scope.dispose()
      if (ownsSlot) {
        this.active -= 1
        busy.delete(chatId)
      }
    }
  }
}
