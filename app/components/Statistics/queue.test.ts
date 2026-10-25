import { apolloErrorReporter } from 'app/gql/apolloClient/createApolloClient/errorReporting'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createStatisticsQueue, MAX_QUEUED_VISITS } from './queue'
import {
  sendStatistics,
  type StatisticsPacket,
  type DeliveryResult,
} from './transport'

const packet: StatisticsPacket = {
  visitorId: 'a'.repeat(24),
  tabId: 'b'.repeat(24),
  events: [
    {
      eventId: 'page.viewed',
      statusCode: 200,
      status: 'success',
      eventKey: 'c'.repeat(24),
      timestamp: 1,
      url: 'https://example.test/',
      referrer: '',
      title: 'Page',
      language: 'en',
      viewport: { width: 390, height: 844 },
    },
  ],
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

test('stops after three total attempts, including repeated page-hide flushes', async () => {
  const send = vi.fn().mockResolvedValue('retry')
  const queue = createStatisticsQueue(send)
  queue.enqueue(packet)
  await vi.advanceTimersByTimeAsync(0)
  for (let i = 0; i < 20; i++) {
    queue.flush()
  }
  await vi.advanceTimersByTimeAsync(999)
  expect(send).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(send).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(2999)
  expect(send).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(1)
  expect(send).toHaveBeenCalledTimes(3)
  await vi.advanceTimersByTimeAsync(60_000)
  queue.flush()
  expect(send).toHaveBeenCalledTimes(3)
  expect(vi.getTimerCount()).toBe(0)
})

test('serializes requests, bounds the queue, and keeps event identity on retry', async () => {
  let complete: (result: DeliveryResult) => void = () => undefined
  const send = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<DeliveryResult>((resolve) => {
          complete = resolve
        }),
    )
    .mockResolvedValue('accepted')
  const queue = createStatisticsQueue(send)
  queue.enqueue(packet)
  await vi.advanceTimersByTimeAsync(0)
  for (let i = 0; i < 150; i++) {
    queue.enqueue(packet)
    queue.flush()
  }
  expect(send).toHaveBeenCalledTimes(1)
  complete('accepted')
  await vi.runAllTimersAsync()
  expect(send).toHaveBeenCalledTimes(MAX_QUEUED_VISITS + 1)
  queue.dispose()
})

test('stops collection for the document when the server reports disabled integration', async () => {
  const send = vi.fn().mockResolvedValue('disabled')
  const queue = createStatisticsQueue(send)
  queue.enqueue(packet)
  queue.enqueue(packet)
  await vi.runAllTimersAsync()
  queue.enqueue(packet)
  queue.flush()
  await vi.runAllTimersAsync()
  expect(send).toHaveBeenCalledTimes(1)
})

test('retries rejected promises but discards permanent failures', async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce('accepted')
    .mockResolvedValue('discard')
  const queue = createStatisticsQueue(send)
  queue.enqueue(packet)
  await vi.runAllTimersAsync()
  expect(send).toHaveBeenCalledTimes(2)
  expect(send.mock.calls[0][0]).toBe(send.mock.calls[1][0])
  queue.enqueue(packet)
  await vi.runAllTimersAsync()
  expect(send).toHaveBeenCalledTimes(3)
})

test.each([
  [{ data: { logStats: [{ id: 'saved' }] } }, 'accepted'],
  [{ data: { logStats: null } }, 'disabled'],
  [{ data: { logStats: [] } }, 'retry'],
  [
    {
      errors: [
        {
          message: 'STATISTICS_UNAVAILABLE',
          extensions: { code: 'STATISTICS_UNAVAILABLE' },
        },
      ],
    },
    'retry',
  ],
  [
    {
      errors: [
        { message: 'BAD_USER_INPUT', extensions: { code: 'BAD_USER_INPUT' } },
      ],
    },
    'discard',
  ],
  [
    {
      errors: [
        {
          message: 'STATISTICS_CONFIGURATION_ERROR',
          extensions: { code: 'STATISTICS_CONFIGURATION_ERROR' },
        },
      ],
    },
    'discard',
  ],
])('interprets the GraphQL delivery response', async (body, expected) => {
  const log = vi.spyOn(apolloErrorReporter, 'error')
  if ('errors' in body) {
    log.mockImplementationOnce(() => undefined)
  }
  const fetchMock = vi.fn().mockResolvedValue(Response.json(body))
  vi.stubGlobal('fetch', fetchMock)
  expect(await sendStatistics(packet)).toBe(expected)
  if ('errors' in body) {
    expect(log).toHaveBeenCalledExactlyOnceWith(
      `[GraphQL error]: Message: ${body.errors[0].message}, Location: undefined, Path: undefined`,
    )
  } else {
    expect(log).not.toHaveBeenCalled()
  }
  const options: RequestInit = fetchMock.mock.calls[0][1] as RequestInit
  expect(new Headers(options.headers).get('content-type')).toBe(
    'application/json',
  )
  expect(options.keepalive).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
})

test('aborts a stalled browser request and clears its deadline', async () => {
  const log = vi
    .spyOn(apolloErrorReporter, 'error')
    .mockImplementationOnce(() => undefined)
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, options: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) =>
          options.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          ),
        ),
    ),
  )
  const result: Promise<DeliveryResult> = sendStatistics(packet)
  await vi.advanceTimersByTimeAsync(6500)
  expect(await result).toBe('retry')
  expect(log).toHaveBeenCalledExactlyOnceWith('[Network error]: aborted')
  expect(vi.getTimerCount()).toBe(0)
})
