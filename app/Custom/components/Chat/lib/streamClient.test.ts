// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CHAT_TOKEN_STORAGE_KEY, sendMessageStream } from './streamClient'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

it('получает и сохраняет токен до сообщения, затем повторно использует его', async () => {
  const fetchMock = vi.fn(
    async (url: string, options?: RequestInit): Promise<Response> => {
      if (url === '/api') {
        expect(JSON.parse(options?.body as string)).toEqual({
          query: 'mutation CreateChatToken { createChatToken }',
        })
        return Response.json({ data: { createChatToken: 'signed-token' } })
      }
      expect(localStorage.getItem(CHAT_TOKEN_STORAGE_KEY)).toBe('signed-token')
      expect(options?.headers).toMatchObject({
        Authorization: 'Bearer signed-token',
      })
      expect(JSON.parse(options?.body as string)).toEqual({ message: 'Вопрос' })
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
    '/api',
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
