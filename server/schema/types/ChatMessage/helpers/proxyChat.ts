import { errorReporter } from '../../../../errorLogging'
import { readChatError } from '../../../../../app/Custom/components/Chat/lib/errors'
import type { Request } from 'express'
import type { TokenUsage } from '../../../../chat/storage'
import { readCompletionStream } from '../../../../../app/Custom/components/Chat/lib/completionStream'

export interface ChatResponse {
  id: string
  success: boolean
  content: string
  usage: TokenUsage
}

interface ChatInput {
  token: string
  message: string
  pageUrl?: string | null
}

export const proxyChat = async (
  data: ChatInput,
  req: Request,
): Promise<ChatResponse> => {
  const controller = new AbortController()
  const disconnect = (): void => controller.abort()
  const timeout = setTimeout(disconnect, 125000)
  req.res?.on('close', disconnect)
  try {
    const url = `http://127.0.0.1:${req.socket.localPort}/api/chat`
    const body = JSON.stringify({ message: data.message, stream: true })
    const forwardedHeaders: Record<string, string> = {}
    for (const [name, value] of Object.entries(req.headers ?? {})) {
      if (value !== undefined) {
        forwardedHeaders[name] = Array.isArray(value) ? value.join(', ') : value
      }
    }
    // The new body has a known length; fetch manages its transfer framing.
    delete forwardedHeaders['transfer-encoding']
    const pageUrl = req.get('X-Chat-Page-Url') || data.pageUrl
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...forwardedHeaders,
        host: new URL(url).host,
        'content-length': String(Buffer.byteLength(body)),
        'content-encoding': 'identity',
        'content-type': 'application/json',
        accept: 'text/event-stream',
        'dialog-token': data.token,
        origin:
          req.get('origin') ||
          `${req.protocol}://${req.get('host') || 'unknown'}`,
        ...(pageUrl ? { 'x-chat-page-url': pageUrl } : {}),
      },
      body,
      signal: controller.signal,
      redirect: 'error',
    }).catch((error: unknown): never => {
      errorReporter.error('[chat.proxy_request]', error)
      throw new Error(
        'Не удалось отправить запрос в чат. Проверьте токен и параметры запроса',
        { cause: error },
      )
    })
    if (!response.ok) {
      throw new Error(await readChatError(response))
    }
    if (
      !response.body ||
      !response.headers.get('content-type')?.includes('text/event-stream')
    ) {
      await response.body?.cancel()
      throw new Error('Сервер чата не вернул потоковый ответ')
    }
    const result: ChatResponse = {
      id: '',
      success: true,
      content: '',
      usage: {},
    }
    for await (const content of readCompletionStream(
      response.body,
      (metadata) => {
        if (metadata.id) {
          result.id = metadata.id
        }
      },
      undefined,
      (value) => {
        if (!value || typeof value !== 'object') {
          return
        }
        const raw = value as Record<string, unknown>
        const details = raw.prompt_tokens_details
        const counts: Record<keyof TokenUsage, unknown> = {
          inputTokens: raw.prompt_tokens,
          outputTokens: raw.completion_tokens,
          cachedTokens:
            details && typeof details === 'object' && 'cached_tokens' in details
              ? details.cached_tokens
              : undefined,
        }
        for (const key of Object.keys(counts) as (keyof TokenUsage)[]) {
          const count = counts[key]
          if (
            typeof count === 'number' &&
            Number.isSafeInteger(count) &&
            count >= 0
          ) {
            result.usage[key] = count
          }
        }
      },
    )) {
      result.content += content
    }
    if (!result.id) {
      throw new Error('Сервер не вернул идентификатор ответа')
    }
    return result
  } finally {
    clearTimeout(timeout)
    req.res?.off('close', disconnect)
    controller.abort()
  }
}
