// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CHAT_TOKEN_STORAGE_KEY, sendMessageStream } from './streamClient'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

it('получает и сохраняет токен до сообщения, затем повторно использует его', async () => {
  const fetchMock = vi.fn(
    async (url: string, options?: RequestInit): Promise<Response> => {
      if (new URL(url, window.location.origin).pathname === '/api/') {
        expect(JSON.parse(options?.body as string).operationName).toBe(
          'CreateChatToken',
        )
        return Response.json({ data: { createChatToken: 'signed-token' } })
      }
      expect(localStorage.getItem(CHAT_TOKEN_STORAGE_KEY)).toBe('signed-token')
      expect(options?.headers).toMatchObject({
        Authorization: 'Bearer signed-token',
      })
      expect(JSON.parse(options?.body as string)).toEqual({
        message: 'Вопрос',
        stream: true,
      })
      return new Response('data: [DONE]\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
  await sendMessageStream('Вопрос', 'statistics-session', callbacks)
  await sendMessageStream('Вопрос', 'statistics-session', callbacks)
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    `${window.location.origin}/api/`,
    '/api/chat',
    '/api/chat',
  ])
  expect(callbacks.onDone).toHaveBeenCalledTimes(2)
  expect(callbacks.onError).not.toHaveBeenCalled()
})

it('не отправляет сообщение при ошибке выдачи токена', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 503 }))
  vi.stubGlobal('fetch', fetchMock)
  const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
  await sendMessageStream('Вопрос', 'session', callbacks)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(callbacks.onError).toHaveBeenCalledOnce()
})

it('удаляет отвергнутый токен без автоматической повторной отправки сообщения', async () => {
  localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, 'invalid')
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 401 }))
  vi.stubGlobal('fetch', fetchMock)
  const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
  await sendMessageStream('Вопрос', 'session', callbacks)
  expect(localStorage.getItem(CHAT_TOKEN_STORAGE_KEY)).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(callbacks.onError).toHaveBeenCalledOnce()
})

it('не отправляет сообщение при GraphQL-ошибке с HTTP 200', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ data: null, errors: [{ message: 'Ошибка хранилища' }] }),
    )
  vi.stubGlobal('fetch', fetchMock)
  const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
  await sendMessageStream('Вопрос', 'session', callbacks)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(localStorage.getItem(CHAT_TOKEN_STORAGE_KEY)).toBeNull()
  expect(callbacks.onError).toHaveBeenCalledOnce()
})

it('sends the current page URL on every message after client-side navigation', async () => {
  localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, 'signed-token')
  const originalUrl = window.location.href
  const pages: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, options: RequestInit) => {
      pages.push(new Headers(options.headers).get('X-Chat-Page-Url') ?? '')
      return new Response('data: [DONE]\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }),
  )
  const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
  try {
    for (const path of [
      '/city/kirov/bath?tab=reviews#form',
      '/map?lat=58&lng=49',
    ]) {
      history.pushState({}, '', path)
      await sendMessageStream('This page', 'session', callbacks)
      expect(pages.at(-1)).toBe(window.location.href)
    }
    expect(pages[0]).not.toBe(pages[1])
    expect(callbacks.onError).not.toHaveBeenCalled()
  } finally {
    history.replaceState({}, '', originalUrl)
  }
})

it.each([true, false])(
  'доставляет ответ и передаёт режим stream=%s',
  async (stream) => {
    localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, 'signed-token')
    const controller = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options: RequestInit) => {
        expect(JSON.parse(options.body as string)).toEqual({
          message: 'Вопрос',
          stream,
        })
        expect(new Headers(options.headers).get('Accept')).toBe(
          stream ? 'text/event-stream' : 'application/json',
        )
        expect(options.signal).toBe(controller.signal)
        return stream
          ? new Response(
              'data: {"choices":[{"delta":{"content":"Ответ"}}]}\n\ndata: [DONE]\n\n',
              { headers: { 'Content-Type': 'text/event-stream' } },
            )
          : Response.json({
              id: 'answer',
              success: true,
              content: 'Ответ',
              usage: {},
            })
      }),
    )
    const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await sendMessageStream(
      'Вопрос',
      'session',
      callbacks,
      controller.signal,
      stream,
    )
    expect(callbacks.onChunk).toHaveBeenCalledExactlyOnceWith('Ответ')
    expect(callbacks.onDone).toHaveBeenCalledOnce()
    expect(callbacks.onError).not.toHaveBeenCalled()
  },
)

it.each([true, false])(
  'сообщает об ошибке ответа в режиме stream=%s',
  async (stream) => {
    localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, 'signed-token')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        stream
          ? new Response('data: {"error":{"message":"Ошибка"}}\n\n', {
              headers: { 'Content-Type': 'text/event-stream' },
            })
          : Response.json({ success: false, error: 'Ошибка' }),
      ),
    )
    const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await sendMessageStream('Вопрос', 'session', callbacks, undefined, stream)
    expect(callbacks.onChunk).not.toHaveBeenCalled()
    expect(callbacks.onDone).not.toHaveBeenCalled()
    expect(callbacks.onError).toHaveBeenCalledOnce()
  },
)

it.each([false, true])(
  'показывает исходную ошибку чата, поток: %s',
  async (stream) => {
    localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, 'signed-token')
    const message = 'Недействительный токен чата'
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ error: message }, { status: 401 })),
    )
    const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    await sendMessageStream('Вопрос', 'session', callbacks, undefined, stream)
    expect(callbacks.onError).toHaveBeenCalledWith(
      expect.objectContaining({ message }),
    )
    expect(callbacks.onDone).not.toHaveBeenCalled()
  },
)
