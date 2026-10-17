import { afterAll, afterEach, expect, test, vi } from 'vitest'
import { ApolloServer } from '@apollo/server'
import type { FormattedExecutionResult } from 'graphql'
import { db } from '../../server/database'
import type { Context } from '../../server/schema/builder'
import express from 'express'
import type { Request } from 'express'
import { schema } from '../../server/schema'
import { logStatistics } from '../../server/statistics'

const req: Request = Object.assign(Object.create(express.request) as Request, {
  headers: { host: 'site.test', 'user-agent': 'fixture-browser' },
  socket: { remoteAddress: '127.0.0.1' },
  app: express(),
})
const api: ApolloServer<Context> = new ApolloServer<Context>({ schema })
const executeStatistics = async (
  data: unknown,
  request: Request = req,
): Promise<FormattedExecutionResult<Record<string, unknown>>> => {
  const response = await api.executeOperation(
    {
      query: 'mutation ($data: Json!) { logStats(data: $data) { id } }',
      variables: { data },
    },
    { contextValue: { req: request, db, currentUser: null } },
  )
  if (response.body.kind !== 'single') {
    throw new Error('Expected a single response')
  }
  return response.body.singleResult
}
afterAll(() => api.stop())

const packet = {
  visitorId: 'a'.repeat(24),
  tabId: 'b'.repeat(24),
  events: [
    {
      eventId: 'page.viewed',
      statusCode: 200,
      status: 'success',
      eventKey: 'c'.repeat(24),
      timestamp: 1000,
      url: 'https://site.test/',
      referrer: '',
      title: 'Page',
      language: 'en',
      viewport: { width: 390, height: 844 },
      userId: 'forged',
      authenticated: true,
    },
  ],
}
const configured = (): void => {
  vi.stubEnv('AGENTS_CENTER_ENDPOINT', 'https://center.test/api/')
  vi.stubEnv('AGENTS_CENTER_TOKEN', 'fixture-secret')
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('disabled integration makes no upstream request', async () => {
  vi.stubEnv('AGENTS_CENTER_TOKEN', '')
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  expect(await logStatistics(packet, req)).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})

test('GraphQL forwards a visitor page view through createActivity with server-only credentials', async () => {
  configured()
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ data: { createActivity: { id: 'activity-1' } } }),
      ),
    )
  vi.stubGlobal('fetch', fetchMock)
  const result = await executeStatistics(packet)
  expect(result.errors).toBeUndefined()
  expect(result.data?.logStats).toEqual([{ id: 'activity-1' }])
  const options: RequestInit = fetchMock.mock.calls[0][1] as RequestInit
  expect(options.headers).toMatchObject({
    Authorization: 'Bearer fixture-secret',
  })
  expect(options.redirect).toBe('error')
  const body = JSON.parse(String(options.body)) as {
    variables: {
      input: { type: string; status: string; data: Record<string, unknown> }
    }
  }
  expect(body.variables.input).toMatchObject({
    type: 'page.viewed',
    status: 'success',
    data: {
      visitorId: packet.visitorId,
      tabId: packet.tabId,
      eventKey: 'c'.repeat(24),
      userId: null,
      authenticated: false,
      site: 'site.test',
      occurredAt: '1970-01-01T00:00:01.000Z',
    },
  })
  expect(JSON.stringify(result)).not.toContain('fixture-secret')
})

test('GraphQL sends Unicode domains in every URL and site field to Agents Center', async () => {
  configured()
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: { createActivity: { id: 'unicode-activity' } },
      }),
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  const request: Request = Object.assign(Object.create(req) as Request, {
    headers: {
      ...req.headers,
      host: 'xn-----7kcbauaijpauj5couvu.xn--p1ai:3000',
      referer: 'https://xn-----7kcbauaijpauj5couvu.xn--p1ai/pricing',
    },
  })
  const result = await executeStatistics(
    {
      ...packet,
      events: [
        {
          ...packet.events[0],
          url: 'https://xn-----7kcbauaijpauj5couvu.xn--p1ai/pricing?next=xn--p1ai',
          referrer: 'https://www.xn--e1afmkfd.xn--p1ai/%D0%BF?q=%2F',
        },
      ],
    },
    request,
  )
  expect(result.errors).toBeUndefined()
  expect(result.data?.logStats).toEqual([{ id: 'unicode-activity' }])
  const options: RequestInit = fetchMock.mock.calls[0][1] as RequestInit
  const body = JSON.parse(String(options.body)) as {
    variables: { input: { data: Record<string, unknown> } }
  }
  expect(body.variables.input.data).toMatchObject({
    site: 'ии-поддержка-сайта.рф',
    url: 'https://ии-поддержка-сайта.рф/pricing?next=xn--p1ai',
    referrer: 'https://www.пример.рф/%D0%BF?q=%2F',
    requestReferer: 'https://ии-поддержка-сайта.рф/pricing',
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

test.each([200, 301, 399, 400, 401, 403, 404, 410, 500, 503])(
  'preserves page status %i in the browser packet and the Activity status',
  async (statusCode) => {
    configured()
    const status: string = statusCode >= 400 ? 'failed' : 'success'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { createActivity: { id: 'status-activity' } },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const result = await executeStatistics({
      ...packet,
      events: [{ ...packet.events[0], statusCode, status }],
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.logStats).toEqual([{ id: 'status-activity' }])
    const options: RequestInit = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(options.body)) as {
      variables: { input: { status: string; data: Record<string, unknown> } }
    }
    expect(body.variables.input).toMatchObject({
      status,
      data: { statusCode, status },
    })
  },
)

test.each([
  { statusCode: undefined, status: undefined },
  { statusCode: '404', status: 'failed' },
  { statusCode: 99, status: 'success' },
  { statusCode: 600, status: 'failed' },
  { statusCode: 404.5, status: 'failed' },
  { statusCode: 404, status: 'success' },
  { statusCode: 200, status: 'failed' },
  { statusCode: 200, status: 'pending' },
])(
  'rejects missing, invalid or contradictory page status %j',
  async (outcome) => {
    configured()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      logStatistics(
        { ...packet, events: [{ ...packet.events[0], ...outcome }] },
        req,
      ),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } })
    expect(fetchMock).not.toHaveBeenCalled()
  },
)

test.each([
  { ...packet, events: [...packet.events, ...packet.events] },
  {
    ...packet,
    events: [{ ...packet.events[0], eventId: 'chat.message.sent' }],
  },
  { ...packet, events: [{ ...packet.events[0], url: 'javascript:alert(1)' }] },
  { ...packet, events: [{ ...packet.events[0], title: 'x'.repeat(501) }] },
])('rejects invalid or out-of-scope events before forwarding', async (data) => {
  configured()
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  await expect(logStatistics(data, req)).rejects.toMatchObject({
    extensions: { code: 'BAD_USER_INPUT' },
  })
  expect(fetchMock).not.toHaveBeenCalled()
})

test.each([
  [401, {}, 'STATISTICS_CONFIGURATION_ERROR'],
  [503, {}, 'STATISTICS_UNAVAILABLE'],
  [
    200,
    { errors: [{ message: 'Valid MessageRecipient token required' }] },
    'STATISTICS_CONFIGURATION_ERROR',
  ],
  [
    200,
    { errors: [{ message: 'sensitive upstream detail fixture-secret' }] },
    'STATISTICS_REJECTED',
  ],
  [200, { data: { createActivity: null } }, 'STATISTICS_UNAVAILABLE'],
])(
  'reports delivery failure in production without leaking upstream details',
  async (status, body, code) => {
    configured()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
    )
    const result = await executeStatistics(packet)
    expect(result.errors?.[0]?.extensions?.code).toBe(code)
    expect(JSON.stringify(result)).not.toContain('fixture-secret')
  },
)

test('connection errors are retryable and do not trigger server retries', async () => {
  configured()
  const fetchMock = vi.fn().mockRejectedValue(new Error('fixture-secret'))
  vi.stubGlobal('fetch', fetchMock)
  await expect(logStatistics(packet, req)).rejects.toMatchObject({
    message: 'Statistics service unavailable.',
    extensions: { code: 'STATISTICS_UNAVAILABLE' },
  })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
