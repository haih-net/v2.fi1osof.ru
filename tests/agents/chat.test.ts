import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import express, { type Express } from 'express'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { schema } from '../../server/schema'
import { db } from '../../server/database'
import { dbOld } from 'server/database_old'
import { setupChat } from '../../server/chat'
import { chatStorage } from '../../server/chat/storage'
import type { ChatResponse } from '../../server/schema/types/ChatMessage/helpers/proxyChat'

const { graphql, extendSchema, parse } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

const fixture = {
  uri: `/agent-tests/${randomUUID()}`,
  id: randomUUID(),
  title: `Test item ${randomUUID()}`,
}
const lookups: string[] = []
const testSchema = extendSchema(
  schema,
  parse(`
  type AgentTestPage { id: String!, title: String! }
  extend type Query { agentTestPage(uri: String!): AgentTestPage }
`),
)
let server: Server | undefined
let base: string
const forwarded: Array<{ pageUrl?: string; marker?: string }> = []

beforeAll(async () => {
  for (const name of ['CHAT_API_BASE_URL', 'CHAT_API_KEY', 'CHAT_MODEL']) {
    if (!process.env[name]?.trim()) {
      throw new Error(`${name} is required for live agent tests`)
    }
  }
  expect(process.env.DATABASE_FILENAME).toBe(':memory:')
  const app: Express = express()
  app.use('/api/chat', (req, _res, next) => {
    forwarded.push({
      pageUrl: req.get('X-Chat-Page-Url'),
      marker: req.get('X-Agent-Test-Marker'),
    })
    next()
  })
  setupChat(app, dbOld)
  app.post('/api', express.json(), async (req, res) => {
    const result = await graphql({
      schema: testSchema,
      source: req.body.query,
      variableValues: req.body.variables,
      operationName: req.body.operationName,
      contextValue: { req, db, currentUser: null },
      rootValue: {
        agentTestPage: ({ uri }: { uri: string }) => {
          lookups.push(uri)
          return uri === fixture.uri ? fixture : null
        },
      },
    })
    res.json(result)
  })
  const httpServer = createServer(app)
  server = httpServer
  await new Promise<void>((resolve) =>
    httpServer.listen(0, '127.0.0.1', resolve),
  )
  const address = httpServer.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing address')
  }
  base = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  const httpServer = server
  if (httpServer) {
    httpServer.closeAllConnections()
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  }
  await db.destroy()
})

async function send(
  token: string,
  message: string,
  pageUrl: string,
): Promise<unknown> {
  const marker = randomUUID()
  const response = await fetch(`${base}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Chat-Page-Url': pageUrl,
      'X-Agent-Test-Marker': marker,
    },
    body: JSON.stringify({
      query: `mutation Send($data: ChatMessageSendDataInput!) {
        sendChatMessage(data: $data) { id success content usage { inputTokens outputTokens } }
      }`,
      variables: { data: { token, message } },
    }),
    signal: AbortSignal.timeout(130000),
  })
  expect(response.ok).toBe(true)
  const result = (await response.json()) as {
    errors?: unknown[]
    data?: { sendChatMessage: ChatResponse }
  }
  expect(result.errors).toBeUndefined()
  const answer = result.data?.sendChatMessage
  expect(answer?.success).toBe(true)
  if (!answer) {
    throw new Error('Missing chat response')
  }
  expect(forwarded).toContainEqual({ pageUrl, marker })

  // Verify persisted records before parsing, so malformed answers remain diagnosable.
  const chatId = token.split('.')[0]
  expect(await chatStorage.listDialogues()).toContainEqual({
    chatId,
    channel: 'chat',
    createdAt: expect.any(String),
  })
  const history = await chatStorage.read(chatId)
  const question = [...history].reverse().find((entry) => entry.role === 'user')
  expect(question).toMatchObject({ content: message, pageUrl, success: true })
  expect(history.find((entry) => entry.id === answer.id)).toMatchObject({
    role: 'assistant',
    content: answer.content,
    success: true,
    replyToId: question?.id,
  })
  // No Markdown extraction or repair: the entire returned content must be JSON.
  return JSON.parse(answer.content) as unknown
}

it('reads the current page from request headers', async () => {
  const token = await chatStorage.issue()
  const pageUrl = `https://example.test/catalog/${randomUUID()}?tab=details#description`
  const result = await send(
    token,
    'Return only a JSON object with one field pageUrl containing the exact current page URL from the message context. Use null if unavailable. Do not use tools or add explanations.',
    pageUrl,
  )
  expect(result).toEqual({ pageUrl })
  expect(
    (await chatStorage.read(token.split('.')[0])).map(({ role }) => role),
  ).toEqual(['user', 'assistant'])
})

it('updates the current page while retaining the previous page in dialogue history', async () => {
  const token = await chatStorage.issue()
  const previousPageUrl = `https://example.test/${randomUUID()}`
  const pageUrl = `https://example.test/${randomUUID()}`
  expect(
    await send(
      token,
      'Return only JSON with the single field pageUrl containing the current page URL. Use null if unavailable. Do not use tools.',
      previousPageUrl,
    ),
  ).toEqual({ pageUrl: previousPageUrl })
  expect(
    await send(
      token,
      'Return only JSON with pageUrl for the current page and previousPageUrl for the page of my previous message. Use null for unavailable values. Do not use tools.',
      pageUrl,
    ),
  ).toEqual({ pageUrl, previousPageUrl })
  expect(
    (await chatStorage.read(token.split('.')[0])).map(({ role }) => role),
  ).toEqual(['user', 'assistant', 'user', 'assistant'])
})

it('looks up the current page through GraphQL and persists tool calls and results', async () => {
  const token = await chatStorage.issue()
  expect(
    await send(
      token,
      'Tell me about the item on this page. Use graphql_request to query agentTestPage(uri: String!) with the pathname of the current page. Return only a JSON object with id and title from the API, or null values if unavailable. During tool calls provide reasoning only in the tool argument, with no surrounding text.',
      `https://example.test${fixture.uri}`,
    ),
  ).toEqual({ id: fixture.id, title: fixture.title })
  expect(lookups).toContain(fixture.uri)
  const history = await chatStorage.read(token.split('.')[0])
  expect(history.filter(({ role }) => role === 'user')).toHaveLength(1)
  expect(history.filter(({ role }) => role === 'assistant')).toHaveLength(1)
  const calls = history.filter(({ role }) => role === 'tool_call')
  expect(calls.length).toBeGreaterThan(0)
  expect(
    calls.map(({ content }) => JSON.parse(content).function.name),
  ).toContain('graphql_request')
  expect(history.filter(({ role }) => role === 'tool')).toEqual(
    expect.arrayContaining([expect.objectContaining({ success: true })]),
  )
  expect(
    history
      .filter(({ role }) => role === 'tool')
      .map(({ content }) => content)
      .join('\n'),
  ).toContain(fixture.id)
})
