import { createRequire } from 'node:module'
import { schema } from '../schema'
import express from 'express'
import { createServer, type Server } from 'node:http'
import { afterEach, expect, it, vi } from 'vitest'
import { setupChat } from './index'
import { ChatStorage } from './storage'
import { createDatabase } from '../database'
import type { Knex } from 'knex'
import { readCompletionStream } from '../../app/Custom/components/Chat/lib/completionStream'

vi.mock('./skills/registry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./skills/registry')>()),
  hasSkills: false,
  skillSummaries: '',
}))

const servers: Server[] = []
const databases: Knex[] = []
let storage: ChatStorage
let token: string
const listen = async (app: ReturnType<typeof express>): Promise<string> => {
  const server = createServer(app)
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Нет адреса')
  }
  return `http://127.0.0.1:${address.port}`
}
afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections()
          server.close(() => resolve())
        }),
    ),
  )
  await Promise.all(databases.splice(0).map((database) => database.destroy()))
})
const configure = async (): Promise<string> => {
  vi.stubEnv('CHAT_API_KEY', 'test-secret')
  vi.stubEnv('CHAT_MODEL', 'test-model')
  const app = express()
  const database = createDatabase()
  databases.push(database)
  storage = new ChatStorage(database)
  token = await storage.issue()
  setupChat(app, database, storage)
  return listen(app)
}
it('передаёт историю и настройки, доставляет первый фрагмент до окончания ответа', async () => {
  const provider = express()
  provider.use(express.json())
  let finish: (() => void) | undefined
  let received: unknown
  let authorization: string | undefined
  provider.post('/v1/chat/completions', (req, res) => {
    received = req.body
    authorization = req.headers.authorization
    res.setHeader('Content-Type', 'text/event-stream')
    res.write(
      'data: {"id":"chatcmpl-provider-test","choices":[{"delta":{"content":"Первый"}}]}\n\n',
    )
    finish = () =>
      res.end(
        'data: {"choices":[{"delta":{"content":" второй"}}]}\n\ndata: [DONE]\n\n',
      )
  })
  vi.stubEnv('CHAT_API_BASE_URL', `${await listen(provider)}/v1`)
  const base = await configure()
  const messages = [
    { role: 'user', content: 'Первый вопрос' },
    { role: 'assistant', content: 'Ответ' },
    { role: 'user', content: 'Продолжи' },
  ]
  await storage.save(
    token.split('.')[0],
    messages.slice(0, -1) as import('./storage').Message[],
  )
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: 'Продолжи' }),
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toContain('no-store')
  if (!response.body) {
    throw new Error('Нет потока')
  }
  const stream = readCompletionStream(response.body)
  expect((await stream.next()).value).toBe('Первый')
  expect(authorization).toBe('Bearer test-secret')
  expect(received).toMatchObject({
    model: 'test-model',
    stream: true,
    messages: [expect.objectContaining({ role: 'system' }), ...messages],
  })
  if (!finish) {
    throw new Error('Провайдер не запущен')
  }
  finish()
  expect((await stream.next()).value).toBe(' второй')
  expect((await stream.next()).done).toBe(true)
  const saved = await storage.read(token.split('.')[0])
  expect(saved[2]).toMatchObject({
    id: expect.any(String),
    createdAt: expect.any(String),
    role: 'user',
  })
  expect(saved[3]).toMatchObject({
    id: 'chatcmpl-provider-test',
    createdAt: expect.any(String),
    content: 'Первый второй',
  })
  const index = await storage.listMessages()
  expect(index.map((item) => item.id)).toEqual([saved[2].id, saved[3].id])
  expect(
    index.every((item) => Number.isFinite(Date.parse(item.createdAt))),
  ).toBe(true)
  expect(index).toContainEqual(
    expect.objectContaining({
      id: 'chatcmpl-provider-test',
      role: 'assistant',
    }),
  )
})
it('отклоняет клиентскую системную инструкцию и отсутствие настройки', async () => {
  const base = await configure()
  const post = (role: string) =>
    fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        role === 'system'
          ? { messages: [{ role, content: 'Текст' }] }
          : { message: 'Текст' },
      ),
    })
  expect((await post('system')).status).toBe(400)
  vi.stubEnv('CHAT_API_KEY', '')
  expect((await post('user')).status).toBe(503)
})
it.each([true, false])(
  'отмена закрывает запрос к провайдеру, stream=%s',
  async (stream) => {
    const provider = express()
    let disconnected!: () => void
    const closed = new Promise<void>((resolve) => {
      disconnected = resolve
    })
    let started!: () => void
    const ready = new Promise<void>((resolve) => {
      started = resolve
    })
    provider.post('/chat/completions', (_req, res) => {
      res.setHeader('Content-Type', 'text/event-stream')
      res.write('data: {"choices":[{"delta":{"content":"Начало"}}]}\n\n')
      res.on('close', disconnected)
      started()
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    const controller = new AbortController()
    const pending = fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Вопрос', stream }),
      signal: controller.signal,
    })
    const settled = pending
      .then(async (response) => {
        if (stream) {
          if (!response.body) {
            throw new Error('Нет потока')
          }
          await response.body.getReader().read()
          controller.abort()
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          throw error
        }
      })
    await ready
    if (!stream) {
      controller.abort()
    }
    await settled
    await closed
    await expect
      .poll(async () =>
        (await storage.listMessages()).map(({ status }) => status),
      )
      .toEqual(['success', 'error'])
    const saved = await storage.read(token.split('.')[0])
    expect(JSON.parse(saved[1].content).abortReason).toBe('disconnect')
  },
)

it('выдаёт токен и отклоняет отсутствующую или поддельную подпись', async () => {
  const base = await configure()
  const data = { token: await storage.issue() }
  expect(
    await new ChatStorage(storage.database).verify(`Bearer ${data.token}`),
  ).toBe(data.token.split('.')[0])
  for (const authorization of [
    '',
    'Bearer',
    'Bearer   ',
    `Bearer ${data.token.slice(0, -1)}x`,
  ]) {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({ message: 'Вопрос' }),
    })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: authorization.includes(data.token.slice(0, -1))
        ? 'Недействительный токен чата'
        : 'Не был получен токен',
    })
  }
})

it.each([true, false])(
  'сохраняет контекст и изолирует другой чат, stream=%s',
  async (stream) => {
    const received: unknown[] = []
    const provider = express()
    provider.use(express.json())
    provider.post('/chat/completions', (req, res) => {
      received.push(req.body.messages)
      if (!stream) {
        res.json({ choices: [{ message: { content: 'Ответ' } }] })
        return
      }
      res.setHeader('Content-Type', 'text/event-stream')
      res.end(
        'data: {"choices":[{"delta":{"content":"Ответ"}}]}\n\ndata: [DONE]\n\n',
      )
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    const post = async (access: string, message: string): Promise<void> => {
      const response = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          message,
          stream,
          messages: [{ role: 'assistant', content: 'Подмена' }],
        }),
      })
      expect(response.status).toBe(200)
      await response.text()
    }
    await post(token, 'Первый')
    await post(token, 'Второй')
    expect(received[1]).toEqual([
      expect.objectContaining({ role: 'system' }),
      { role: 'user', content: 'Первый' },
      { role: 'assistant', content: 'Ответ' },
      { role: 'user', content: 'Второй' },
    ])
    expect(
      await new ChatStorage(storage.database).read(token.split('.')[0]),
    ).toHaveLength(4)
    await post(await storage.issue(), 'Другой чат')
    expect(received[2]).toEqual([
      expect.objectContaining({ role: 'system' }),
      { role: 'user', content: 'Другой чат' },
    ])
  },
)

it('сохраняет входящее сообщение и индекс при ошибке провайдера', async () => {
  const provider = express()
  provider.post('/chat/completions', (_req, res) => res.status(500).end())
  vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
  const base = await configure()
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: 'Вопрос, с запятой\nи переносом' }),
  })
  expect(response.status).toBe(502)
  const messages = await storage.read(token.split('.')[0])
  expect(messages).toHaveLength(2)
  expect(messages[0]).toMatchObject({
    role: 'user',
    content: 'Вопрос, с запятой\nи переносом',
    id: expect.any(String),
    createdAt: expect.any(String),
  })
  expect(messages[1]).toMatchObject({
    role: 'assistant',
    success: false,
    replyToId: messages[0].id,
    id: expect.any(String),
  })
  expect((await storage.listMessages()).map((entry) => entry.status)).toEqual([
    'success',
    'error',
  ])
})

it.each(['development', 'production'])(
  'диагностика ответа провайдера в режиме %s',
  async (mode) => {
    const provider = express()
    provider.post('/chat/completions', (_req, res) => {
      res.setHeader('x-request-id', 'provider-request-test')
      res.status(402).json({ error: { message: 'Insufficient credits' } })
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    vi.stubEnv('NODE_ENV', mode)
    const base = await configure()
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const response = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: 'Вопрос' }),
      })
      expect(response.status).toBe(502)
      expect(await response.json()).toMatchObject({
        error: 'Insufficient credits',
        success: false,
        id: expect.any(String),
      })
      const saved = await storage.read(token.split('.')[0])
      expect(saved[1].success).toBe(false)
      expect(JSON.parse(saved[1].content)).toMatchObject({
        providerStatus: 402,
        providerRequestId: 'provider-request-test',
        responseBody: '{"error":{"message":"Insufficient credits"}}',
      })
      if (mode === 'development') {
        expect(log).toHaveBeenCalledWith(
          '[chat.provider_response]',
          expect.objectContaining({
            chatId: token.split('.')[0],
            messageId: expect.any(String),
            status: 402,
            providerRequestId: 'provider-request-test',
            responseBody: '{"error":{"message":"Insufficient credits"}}',
          }),
          expect.any(Error),
        )
        expect(JSON.stringify(log.mock.calls)).not.toContain('test-secret')
      } else {
        expect(log).not.toHaveBeenCalled()
      }
    } finally {
      log.mockRestore()
    }
  },
)

it('пишет исходную ошибку хранилища со стеком и этапом выполнения', async () => {
  vi.stubEnv('NODE_ENV', 'development')
  const base = await configure()
  const failure = new Error('EACCES: storage unavailable')
  const read = vi.spyOn(storage, 'appendUserMessage').mockRejectedValue(failure)
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Вопрос' }),
    })
    expect(response.status).toBe(502)
    expect(log).toHaveBeenCalledWith(
      '[chat.request]',
      expect.objectContaining({
        stage: 'save_user_message',
        chatId: token.split('.')[0],
        messageId: expect.any(String),
      }),
      failure,
    )
    expect(await response.json()).toMatchObject({ error: failure.message })
    expect(failure.stack).toContain('EACCES')
  } finally {
    read.mockRestore()
    log.mockRestore()
  }
})

it.each(['ChatDialogue', 'ChatMessage'])(
  'восстанавливает отсутствующие записи %s для действующего токена',
  async (missing) => {
    const provider = express()
    provider.post('/chat/completions', (_req, res) => {
      res.setHeader('Content-Type', 'text/event-stream')
      res.end(
        'data: {"choices":[{"delta":{"content":"Ответ"}}]}\n\ndata: [DONE]\n\n',
      )
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    const chatId = token.split('.')[0]
    await storage.database(missing).where({ chatId }).delete()
    expect(await storage.verify(`Bearer ${token}`)).toBe(chatId)
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Продолжим' }),
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('[DONE]')
    expect(await storage.read(chatId)).toMatchObject([
      { role: 'user', content: 'Продолжим' },
      { role: 'assistant', content: 'Ответ' },
    ])
    expect(await storage.listMessages()).toHaveLength(2)
  },
)

it('одновременное восстановление не перезаписывает историю', async () => {
  await configure()
  const chatId = token.split('.')[0]
  await storage.database('ChatDialogue').where({ chatId }).delete()
  const results = await Promise.all(
    Array.from({ length: 8 }, () => storage.read(chatId)),
  )
  expect(results).toEqual(Array.from({ length: 8 }, () => []))
  await storage.append(chatId, {
    id: 'preserved',
    createdAt: new Date().toISOString(),
    role: 'user',
    content: 'Сохранить',
  })
  await Promise.all(Array.from({ length: 8 }, () => storage.read(chatId)))
  expect(await storage.read(chatId)).toMatchObject([
    { id: 'preserved', content: 'Сохранить' },
  ])
})

it.each([true, false])(
  'выполняет инструменты, сохраняет историю и usage в режиме stream=%s',
  async (stream) => {
    const provider = express()
    provider.use(express.json())
    let requests = 0
    provider.post('/chat/completions', (req, res) => {
      expect(req.body.stream).toBe(stream)
      expect(req.body.stream_options).toEqual(
        stream ? { include_usage: true } : undefined,
      )
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream')
      }
      if (requests++ === 0) {
        expect(req.body.tools[0].function.name).toBe('graphql_request')
        const args = JSON.stringify({
          reasoning: 'Проверю доступные данные.',
          query: 'query Search($term: String!) { search(term: $term) }',
          variables: { term: 'Example product' },
        })
        if (!stream) {
          res.json({
            id: 'tool-round',
            choices: [
              {
                message: {
                  content: null,
                  tool_calls: [
                    {
                      id: 'call-1',
                      type: 'function',
                      function: { name: 'graphql_request', arguments: args },
                    },
                  ],
                },
              },
            ],
            usage: {
              prompt_tokens: 100,
              prompt_tokens_details: { cached_tokens: 40 },
              completion_tokens: 10,
            },
          })
          return
        }
        for (const fragment of [
          {
            index: 0,
            id: 'call-1',
            function: { name: 'graphql_request', arguments: args.slice(0, 20) },
          },
          { index: 0, function: { arguments: args.slice(20) } },
        ]) {
          res.write(
            `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [fragment] } }] })}\n\n`,
          )
        }
        res.end(
          'data: {"choices":[],"usage":{"prompt_tokens":100,"prompt_tokens_details":{"cached_tokens":40},"completion_tokens":10}}\n\ndata: [DONE]\n\n',
        )
      } else {
        expect(req.body.messages.at(-1)).toMatchObject({
          role: 'tool',
          tool_call_id: 'call-1',
          content: '{"data":{"search":[]}}',
        })
        if (!stream) {
          res.json({
            id: 'final-answer',
            choices: [{ message: { content: 'Ничего не найдено.' } }],
            usage: {
              prompt_tokens: 200,
              prompt_tokens_details: { cached_tokens: 80 },
              completion_tokens: 20,
            },
          })
          return
        }
        res.end(
          'data: {"choices":[{"delta":{"content":"Ничего не найдено."}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":200,"prompt_tokens_details":{"cached_tokens":80},"completion_tokens":20}}\n\ndata: [DONE]\n\n',
        )
      }
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    vi.stubEnv('CHAT_API_KEY', 'test-secret')
    vi.stubEnv('CHAT_MODEL', 'test-model')
    const app = express()
    const database = createDatabase()
    databases.push(database)
    storage = new ChatStorage(database)
    token = await storage.issue()
    setupChat(app, database, storage)
    let apiCalls = 0
    app.post('/api', express.json(), (req, res) => {
      apiCalls++
      expect(req.headers.authorization).toBeUndefined()
      expect(req.headers.cookie).toBeUndefined()
      expect(req.body.variables).toEqual({ term: 'Example product' })
      res.json({ data: { search: [] } })
    })
    const base = await listen(app)
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Cookie: 'session=admin',
      },
      body: JSON.stringify({ message: 'Найди товар Example product', stream }),
    })
    const output = await response.text()
    expect(output.indexOf('Проверю')).toBeLessThan(output.indexOf('Ничего'))
    expect(response.headers.get('content-type')).toContain(
      stream ? 'text/event-stream' : 'application/json',
    )
    if (stream) {
      expect(output).toContain(
        JSON.stringify({
          id: (await storage.read(token.split('.')[0])).at(-1)?.id,
          usage: {
            prompt_tokens: 300,
            prompt_tokens_details: { cached_tokens: 120 },
            completion_tokens: 30,
          },
          choices: [],
        }),
      )
      expect(output).toContain('[DONE]')
    } else {
      expect(JSON.parse(output)).toEqual({
        id: 'final-answer',
        success: true,
        content: '\n\nПроверю доступные данные.\n\nНичего не найдено.',
        usage: { inputTokens: 300, cachedTokens: 120, outputTokens: 30 },
      })
    }
    expect(apiCalls).toBe(1)
    const expectedUsage = {
      inputTokens: 300,
      cachedTokens: 120,
      outputTokens: 30,
    }
    expect((await storage.read(token.split('.')[0])).at(-1)?.usage).toEqual(
      expectedUsage,
    )
    expect((await storage.listMessages()).at(-1)?.usage).toEqual(expectedUsage)
    expect((await storage.listMessages()).at(-1)).toMatchObject({
      role: 'assistant',
      status: 'success',
      usage: expectedUsage,
    })
    expect(
      (await storage.read(token.split('.')[0])).map(({ role }) => role),
    ).toEqual(['user', 'tool_call', 'tool', 'assistant'])
    expect((await storage.listMessages()).map(({ role }) => role)).toEqual([
      'user',
      'assistant',
    ])
  },
)

const postMessage = (base: string, message = 'Test error'): Promise<Response> =>
  fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  })

it('logs the incoming message and a failed answer when configuration is missing', async () => {
  const base = await configure()
  vi.stubEnv('CHAT_API_KEY', '')
  const response = await postMessage(base)
  const body = await response.json()
  expect(response.status).toBe(503)
  const saved = await storage.read(token.split('.')[0])
  expect(saved).toMatchObject([
    { role: 'user', success: true },
    { role: 'assistant', success: false, id: body.id, replyToId: saved[0].id },
  ])
})

it.each(['broken-stream', 'stream-error', 'connection-error', 'rate-limit'])(
  'persists an identifiable error for %s',
  async (failure) => {
    const provider = express()
    provider.post('/chat/completions', (req, res) => {
      if (failure === 'connection-error') {
        req.socket.destroy()
        return
      }
      if (failure === 'rate-limit') {
        res.status(429).json({ error: { message: 'Rate limited' } })
        return
      }
      res.setHeader('Content-Type', 'text/event-stream')
      res.write(
        'data: {"id":"generation-error-test","choices":[{"delta":{"content":"Partial answer"}}]}\n\n',
      )
      res.end(
        failure === 'stream-error'
          ? 'data: {"error":{"code":500,"message":"Provider failed"}}\n\ndata: [DONE]\n\n'
          : '',
      )
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    const response = await postMessage(base)
    const body = await response.text()
    expect(body).toContain('"success":false')
    const saved = await storage.read(token.split('.')[0])
    expect(saved).toHaveLength(2)
    expect(saved[1]).toMatchObject({
      role: 'assistant',
      success: false,
      replyToId: saved[0].id,
    })
    expect(body).toContain(saved[1].id)
    if (failure.startsWith('stream') || failure === 'broken-stream') {
      expect(saved[1].id).toBe('generation-error-test')
      expect(JSON.parse(saved[1].content).partialAnswer).toBe('Partial answer')
    }
    expect((await storage.listMessages()).map(({ status }) => status)).toEqual([
      'success',
      'error',
    ])
  },
)

it('logs a concurrent rejected message without overwriting the active conversation', async () => {
  const provider = express()
  let finish!: () => void
  provider.post('/chat/completions', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.write('data: {"choices":[{"delta":{"content":"Answer"}}]}\n\n')
    finish = () => res.end('data: [DONE]\n\n')
  })
  vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
  const base = await configure()
  const first = await postMessage(base, 'First')
  const second = await postMessage(base, 'Second')
  expect(second.status).toBe(409)
  await second.text()
  finish()
  await first.text()
  const saved = await storage.read(token.split('.')[0])
  expect(saved).toHaveLength(4)
  expect(
    saved.filter(({ role }) => role === 'user').map(({ content }) => content),
  ).toEqual(['First', 'Second'])
  expect(
    saved
      .filter(({ role }) => role === 'assistant')
      .map(({ success }) => success),
  ).toEqual([false, true])
  expect(await storage.listMessages()).toHaveLength(4)
})

it('records timeout as an unsuccessful answer', async () => {
  const provider = express()
  provider.post('/chat/completions', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.write('data: {"choices":[{"delta":{"content":"Beginning"}}]}\n\n')
  })
  vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
  const base = await configure()
  const original = globalThis.setTimeout
  const timer = vi
    .spyOn(globalThis, 'setTimeout')
    .mockImplementation(((
      callback: () => void,
      delay: number | undefined,
      ...args: unknown[]
    ) =>
      original(
        callback,
        delay === 120000 ? 40 : delay,
        ...args,
      )) as typeof setTimeout)
  try {
    const response = await postMessage(base)
    expect(await response.text()).toContain('"success":false')
    const saved = await storage.read(token.split('.')[0])
    expect(saved[1].success).toBe(false)
    expect(JSON.parse(saved[1].content).abortReason).toBe('timeout')
  } finally {
    timer.mockRestore()
  }
})

it('preserves an unknown success status in the database', async () => {
  await configure()
  await storage.append(token.split('.')[0], {
    id: 'legacy',
    role: 'assistant',
    content: 'Legacy answer',
    createdAt: '2026-10-16T12:00:00.000Z',
  })
  expect(await storage.listMessages()).toMatchObject([
    { status: 'unknown', success: undefined },
  ])
})

it('rejects a skill tool call when no skills are registered', async () => {
  const provider = express()
  provider.use(express.json())
  let requests = 0
  provider.post('/chat/completions', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    expect(
      req.body.tools.map(
        (tool: { function: { name: string } }) => tool.function.name,
      ),
    ).toEqual(['graphql_request', 'web_search', 'get_system_info'])
    if (requests++ === 0) {
      res.write(
        `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'skill-1', type: 'function', function: { name: 'read_skill', arguments: JSON.stringify({ id: 'bathhouse-cards', reasoning: 'Проверю правила вывода карточек.' }) } }] } }] })}\n\n`,
      )
      res.end('data: [DONE]\n\n')
    } else {
      const result = req.body.messages.at(-1)
      expect(result).toMatchObject({ role: 'tool', tool_call_id: 'skill-1' })
      expect(JSON.parse(result.content).error).toContain(
        'Unknown tool: read_skill',
      )
      res.end(
        'data: {"choices":[{"delta":{"content":"Готово"}}]}\n\ndata: [DONE]\n\n',
      )
    }
  })
  vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
  const base = await configure()
  const response = await postMessage(base)
  const output = await response.text()
  expect(output).not.toContain('Проверю правила')
  expect(output).toContain('Готово')
  expect(output).toContain('[DONE]')
  const saved = await storage.read(token.split('.')[0])
  expect(saved.map(({ role }) => role)).toEqual([
    'user',
    'tool_call',
    'tool',
    'assistant',
  ])
  expect(saved[2].success).toBe(false)
  expect(JSON.parse(saved[2].content)).toMatchObject({
    toolCallId: 'skill-1',
    result: {
      error: expect.stringContaining('Unknown tool: read_skill'),
    },
  })
  expect(saved[3]).toMatchObject({ role: 'assistant', success: true })
  expect((await storage.listMessages()).map(({ role }) => role)).toEqual([
    'user',
    'assistant',
  ])
})

it('сохраняет URL текущей страницы вместе с сообщением пользователя', async () => {
  const provider = express()
  provider.use(express.json())
  const pageUrl =
    'http://localhost:3111/products/example?tab=details#description'
  provider.post('/chat/completions', (req, res) => {
    expect(req.body.messages).toContainEqual({
      role: 'user',
      content: 'Help me find a product',
    })
    res.setHeader('Content-Type', 'text/event-stream')
    res.end(
      'data: {"choices":[{"delta":{"content":"Answer"}}]}\n\ndata: [DONE]\n\n',
    )
  })
  vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
  const base = await configure()
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Chat-Page-Url': pageUrl,
    },
    body: JSON.stringify({ message: 'Help me find a product' }),
  })
  expect(await response.text()).toContain('[DONE]')
  expect((await storage.read(token.split('.')[0]))[0].pageUrl).toBe(pageUrl)
})

it.each([true, false])(
  'сохраняет последний usage без повторного подсчёта, завершение: %s',
  async (completed) => {
    const provider = express()
    provider.use(express.json())
    provider.post('/chat/completions', (req, res) => {
      expect(req.body.stream_options).toEqual({ include_usage: true })
      res.setHeader('Content-Type', 'text/event-stream')
      const usage = {
        prompt_tokens: 123,
        prompt_tokens_details: { cached_tokens: 0 },
        completion_tokens: 7,
      }
      const chunk = `data: ${JSON.stringify({ choices: [], usage })}\n\n`
      res.end(chunk + chunk + (completed ? 'data: [DONE]\n\n' : ''))
    })
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    await (await postMessage(base)).text()
    const expectedUsage = { inputTokens: 123, cachedTokens: 0, outputTokens: 7 }
    const saved = await storage.read(token.split('.')[0])
    expect(saved[1]).toMatchObject({ success: completed, usage: expectedUsage })
    expect((await storage.listMessages())[1].usage).toEqual(expectedUsage)
  },
)

it('не подменяет отсутствующие счётчики нулями', async () => {
  const provider = express()
  provider.post('/chat/completions', (_req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.end(
      'data: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":3}}\n\ndata: [DONE]\n\n',
    )
  })
  vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
  const base = await configure()
  await (await postMessage(base)).text()
  expect((await storage.read(token.split('.')[0]))[1].usage).toEqual({
    inputTokens: 12,
    outputTokens: 3,
  })
  expect((await storage.listMessages()).at(-1)?.usage).toEqual({
    inputTokens: 12,
    outputTokens: 3,
  })
})

it.each([true, false])(
  'сохраняет отказ провайдера в режиме stream=%s',
  async (stream) => {
    const provider = express()
    provider.post('/chat/completions', (_req, res) =>
      res.status(429).json({ error: 'Лимит' }),
    )
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Вопрос', stream }),
    })
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ success: false })
    expect((await storage.read(token.split('.')[0]))[1].success).toBe(false)
  },
)

it.each(['{', '{"choices":[]}', '{"error":{"message":"Ошибка"}}'])(
  'отклоняет некорректный JSON-ответ модели: %s',
  async (body) => {
    const provider = express()
    provider.post('/chat/completions', (_req, res) =>
      res.type('application/json').send(body),
    )
    vi.stubEnv('CHAT_API_BASE_URL', await listen(provider))
    const base = await configure()
    const response = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: 'Вопрос', stream: false }),
    })
    expect(response.status).toBe(502)
    expect(await response.json()).toMatchObject({ success: false })
    const saved = await storage.read(token.split('.')[0])
    expect(saved[1].success).toBe(false)
    expect(JSON.parse(saved[1].content).responseBody).toBe(body)
  },
)

it('отклоняет неboolean режим до записи истории', async () => {
  const base = await configure()
  const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message: 'Вопрос', stream: 'false' }),
  })
  expect(response.status).toBe(400)
  expect(await storage.read(token.split('.')[0])).toEqual([])
})

it.each(['', '   ', 'invalid-token'])(
  'возвращает ошибку токена %j через настоящий HTTP-запрос GraphQL-прокси к чату',
  async (token) => {
    const base = await configure()
    const { graphql } = createRequire(import.meta.url)(
      'graphql',
    ) as typeof import('graphql')
    const result = await graphql({
      schema,
      source:
        'mutation($data: ChatMessageSendDataInput!) { sendChatMessage(data: $data) { content } }',
      variableValues: { data: { token, message: 'Привет' } },
      contextValue: {
        currentUser: null,
        req: {
          socket: { localPort: Number(new URL(base).port) },
          get: () => base,
        },
      },
    })
    expect(result.data).toBeNull()
    expect(result.errors?.[0].message).toBe(
      token.trim() ? 'Недействительный токен чата' : 'Не был получен токен',
    )
  },
)
