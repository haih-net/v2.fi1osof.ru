import { afterEach, expect, it, vi } from 'vitest'
import express, { type Request } from 'express'
import { logStatistics } from './statistics'

const req: Request = Object.assign(Object.create(express.request) as Request, {
  headers: { host: 'site.test' },
  socket: { remoteAddress: '127.0.0.1' },
  app: express(),
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
it.each([
  'chat.message.sent',
  'chat.message.received',
  'chat.message.error',
  'page.viewed',
])('сохраняет %s и не принимает поддельную идентификацию', async (eventId) => {
  vi.stubEnv('AGENTS_CENTER_ENDPOINT', 'https://center.test/api/')
  vi.stubEnv('AGENTS_CENTER_TOKEN', 'test-token')
  const request = vi.fn(async () =>
    Response.json({ data: { createActivity: { id: 'saved' } } }),
  )
  vi.stubGlobal('fetch', request)
  const event = {
    eventId,
    eventKey: 'c'.repeat(24),
    timestamp: 1000,
    url: 'https://site.test/ai',
    messageId: 'message',
    message: 'Вопрос',
    sessionId: 'session',
    response: 'Ответ',
    error: { name: 'Error', message: 'Ошибка' },
    userId: 'подделка',
    authenticated: true,
    statusCode: 200,
    status: 'success',
    referrer: '',
    title: 'Страница',
    language: 'ru',
    viewport: { width: 390, height: 844 },
  }
  expect(
    await logStatistics(
      { visitorId: 'a'.repeat(24), tabId: 'b'.repeat(24), events: [event] },
      req,
    ),
  ).toEqual([{ id: 'saved' }])
  const call = request.mock.calls[0] as unknown as [string, RequestInit]
  const payload = JSON.parse(String(call[1].body))
  expect(payload.variables.input.type).toBe(eventId)
  expect(payload.variables.input.data).toMatchObject({
    userId: null,
    authenticated: false,
  })
  if (eventId.startsWith('chat.')) {
    expect(payload.variables.input.data).toMatchObject({
      message: 'Вопрос',
      response: 'Ответ',
      error: { name: 'Error', message: 'Ошибка' },
    })
  }
})
