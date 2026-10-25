import { chatErrorMessage, readChatError } from './errors'
import { initializeApollo } from 'app/gql/apolloClient'
import { CreateChatTokenDocument } from 'app/gql/generated'
import { readCompletionStream } from './completionStream'

export type StreamCallbacks = {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (error: Error) => void
}

// Старый транспорт n8n использовал следующее правило:
// incomplete JSON, skip
// SSE собирается до границы события; ошибки JSON теперь завершают запрос.
export async function sendMessageStream(
  message: string,
  _sessionId: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  stream = true,
): Promise<void> {
  try {
    const pageUrl = window.location.href
    const send = async (): Promise<Response> => {
      abortSignal?.throwIfAborted()
      const token = await getChatToken(abortSignal)
      const userToken = localStorage.getItem('token')
      return fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: stream ? 'text/event-stream' : 'application/json',
          'dialog-token': token,
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {}),
          'X-Chat-Page-Url': pageUrl,
        },
        body: JSON.stringify({ message, stream }),
        signal: abortSignal,
      })
    }
    let response = await send()
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (response.status !== 401) {
        break
      }
      const error: unknown = await response
        .clone()
        .json()
        .catch(() => null)
      if (
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        error.code !== 'INVALID_DIALOG_TOKEN'
      ) {
        break
      }
      localStorage.removeItem(CHAT_TOKEN_STORAGE_KEY)
      if (attempt === 1) {
        break
      }
      await response.body?.cancel()
      response = await send()
    }
    if (!response.ok) {
      throw new Error(await readChatError(response))
    }
    if (!stream) {
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Сервер не вернул JSON-ответ')
      }
      const result: unknown = await response.json()
      if (
        !result ||
        typeof result !== 'object' ||
        !('success' in result) ||
        result.success !== true ||
        !('content' in result) ||
        typeof result.content !== 'string'
      ) {
        throw new Error(chatErrorMessage(result, 'Некорректный ответ сервера'))
      }
      callbacks.onChunk(result.content)
      callbacks.onDone()
      return
    }
    if (
      !response.body ||
      !response.headers.get('content-type')?.includes('text/event-stream')
    ) {
      throw new Error('Сервер не вернул потоковый ответ')
    }
    for await (const text of readCompletionStream(response.body)) {
      callbacks.onChunk(text)
    }
    callbacks.onDone()
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)))
  }
}

export const CHAT_TOKEN_STORAGE_KEY = 'chat_access_token'

const getChatToken = async (signal?: AbortSignal): Promise<string> => {
  const existing = localStorage.getItem(CHAT_TOKEN_STORAGE_KEY)
  if (existing) {
    return existing
  }
  const result = await initializeApollo({ withWs: false }).mutate({
    mutation: CreateChatTokenDocument,
    context: { fetchOptions: { signal } },
  })
  const token = result?.data?.createChatToken
  if (typeof token !== 'string' || !token) {
    throw new Error('Сервер не вернул токен чата')
  }
  localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, token)
  return token
}
