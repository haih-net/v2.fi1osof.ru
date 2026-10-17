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
): Promise<void> {
  try {
    const pageUrl = window.location.href
    const token = await getChatToken(abortSignal)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
        'X-Chat-Page-Url': pageUrl,
      },
      body: JSON.stringify({ message }),
      signal: abortSignal,
    })
    if (response.status === 401) {
      localStorage.removeItem(CHAT_TOKEN_STORAGE_KEY)
    }
    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? 'Слишком много запросов. Попробуйте немного позже.'
          : response.status === 503
            ? 'Помощник пока не настроен.'
            : `Не удалось получить ответ (HTTP ${response.status})`,
      )
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
  const response = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'mutation CreateChatToken { createChatToken }',
    }),
    signal,
  })
  if (!response.ok) {
    throw new Error('Не удалось создать чат')
  }
  const result = (await response.json()) as {
    data?: { createChatToken?: unknown } | null
    errors?: unknown[]
  }
  const token = result?.data?.createChatToken
  if (result?.errors?.length || typeof token !== 'string' || !token) {
    throw new Error('Сервер не вернул токен чата')
  }
  localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, token)
  return token
}
