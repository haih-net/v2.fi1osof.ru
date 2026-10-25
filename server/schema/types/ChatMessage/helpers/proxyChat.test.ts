import { errorReporter } from '../../../../errorLogging'
import { createRequire } from 'node:module'
import { EventEmitter } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { schema } from '../../../index'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

afterEach(() => vi.unstubAllGlobals())

const execute = async (token: string | null | undefined = 'guest-token') => {
  const res = new EventEmitter()
  const result = await graphql({
    schema,
    source: `mutation($data: ChatMessageSendDataInput!) {
      sendChatMessage(data: $data) {
        id success content usage { inputTokens cachedTokens outputTokens }
      }
    }`,
    variableValues: {
      data: { token, message: 'Вопрос', pageUrl: 'https://example.test/page' },
    },
    contextValue: {
      currentUser: null,
      req: {
        socket: { localPort: 3456 },
        headers: {
          host: 'example.test',
          'content-length': '999',
          'content-type': 'application/graphql',
          authorization: 'Bearer original',
          'x-custom-header': 'preserved',
        },
        res,
        get: (name: string) =>
          name === 'origin' ? 'https://example.test' : undefined,
      },
    },
  })
  expect(res.listenerCount('close')).toBe(0)
  return result
}

it('публичная мутация собирает поток и полный usage без повторного вызова модели', async () => {
  const body =
    'data: {"choices":[{"delta":{"content":"# Ответ\\n"}}]}\n\n' +
    'data: {"choices":[{"delta":{"content":"Текст"}}]}\n\n' +
    'data: {"id":"answer-id","usage":{"prompt_tokens":12,"prompt_tokens_details":{"cached_tokens":3},"completion_tokens":7},"choices":[]}\n\n' +
    'data: [DONE]\n\n'
  const bytes = new TextEncoder().encode(body)
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of bytes) {
            controller.enqueue(new Uint8Array([byte]))
          }
          controller.close()
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  const result = await execute()
  expect(result.errors).toBeUndefined()
  expect(result.data?.sendChatMessage).toEqual({
    id: 'answer-id',
    success: true,
    content: '# Ответ\nТекст',
    usage: { inputTokens: 12, cachedTokens: 3, outputTokens: 7 },
  })
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
    'http://127.0.0.1:3456/api/chat',
    expect.objectContaining({
      body: JSON.stringify({ message: 'Вопрос', stream: true }),
      headers: expect.objectContaining({
        authorization: 'Bearer original',
        'dialog-token': 'guest-token',
        origin: 'https://example.test',
        'x-chat-page-url': 'https://example.test/page',
        host: '127.0.0.1:3456',
        'content-type': 'application/json',
        'content-length': String(
          Buffer.byteLength(
            JSON.stringify({ message: 'Вопрос', stream: true }),
          ),
        ),
        'x-custom-header': 'preserved',
      }),
    }),
  )
})

it.each([
  'data: {"choices":[{"delta":{"content":"Часть"}}]}\n\n',
  'data: {"error":{"message":"Ошибка"}}\n\n',
])('не возвращает частичный результат как успешный', async (body) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(body, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ),
  )
  const result = await execute()
  expect(result.errors).toHaveLength(1)
  expect(result.data).toBeNull()
})

it.each(['', '   ', 'invalid-token'])(
  'передаёт токен %j без собственной валидации и возвращает ошибку чата',
  async (token) => {
    const message = token.trim()
      ? 'Недействительный токен чата'
      : 'Токен чата обязателен. Получите его через createChatToken'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ error: message }, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await execute(token)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][1].headers['dialog-token']).toBe(token)
    expect(result.errors?.[0].message).toBe(message)
    expect(result.data).toBeNull()
  },
)

it('отсутствующий обязательный токен отклоняется схемой GraphQL', async () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const result = await graphql({
    schema,
    source:
      'mutation { sendChatMessage(data: { message: "Привет" }) { content } }',
  })
  expect(result.errors?.[0].message).toContain('token')
  expect(result.errors?.[0].message).toContain('was not provided')
  expect(fetchMock).not.toHaveBeenCalled()
})

it.each([
  [400, { error: 'Некорректное сообщение' }, 'Некорректное сообщение'],
  [503, { error: { message: 'Хранилище недоступно' } }, 'Хранилище недоступно'],
  [502, { error: 'Insufficient credits' }, 'Insufficient credits'],
])('сохраняет сообщение HTTP-ошибки %s', async (status, body, message) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json(body, { status })),
  )
  expect((await execute()).errors?.[0].message).toBe(message)
})

it('сохраняет сообщение ошибки внутри потока', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          'data: {"error":{"message":"Provider rejected the model"}}\n\n',
          { headers: { 'Content-Type': 'text/event-stream' } },
        ),
      ),
  )
  expect((await execute()).errors?.[0].message).toBe(
    'Provider rejected the model',
  )
})

it.each(['п4п34п', '🔑', 'token\r\nInjected: value', 'token\0value'])(
  'возвращает понятную ошибку при невозможности передать токен %j в HTTP-заголовке',
  async (token) => {
    const log = vi
      .spyOn(errorReporter, 'error')
      .mockImplementationOnce(() => undefined)
    try {
      // Настоящий fetch проверяет заголовки до сетевого запроса.
      const result = await execute(token)
      expect(result.errors?.[0].message).toBe(
        'Не удалось отправить запрос в чат. Проверьте токен и параметры запроса',
      )
      expect(result.data).toBeNull()
      expect(log).toHaveBeenCalledExactlyOnceWith(
        '[chat.proxy_request]',
        expect.any(TypeError),
      )
    } finally {
      log.mockRestore()
    }
  },
)

it('логирует исходный сетевой сбой, не подменяя ошибки ответа чата', async () => {
  const failure = new TypeError('fetch failed', {
    cause: new Error('ECONNREFUSED'),
  })
  const log = vi
    .spyOn(errorReporter, 'error')
    .mockImplementationOnce(() => undefined)
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))
  try {
    const result = await execute()
    expect(result.errors?.[0].message).toBe(
      'Не удалось отправить запрос в чат. Проверьте токен и параметры запроса',
    )
    expect(log).toHaveBeenCalledExactlyOnceWith('[chat.proxy_request]', failure)
  } finally {
    log.mockRestore()
  }
})
