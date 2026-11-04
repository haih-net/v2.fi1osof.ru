import { setTimeout as delay } from 'node:timers/promises'
import { beforeEach, expect, it, vi } from 'vitest'
import { ChatAgent } from '../../server/chat/agent/ChatAgent'
import { createAgentContext } from '../../server/chat/agent/context'
import { MemoryStorage } from '../../server/chat/testing/MemoryStorage'

vi.mock('node:timers/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:timers/promises')>()),
  setTimeout: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(delay).mockReset().mockResolvedValue(undefined)
})

it('waits before retrying and saves one successful answer', async () => {
  const timers = await vi.importActual<typeof import('node:timers/promises')>(
    'node:timers/promises',
  )
  vi.mocked(delay).mockImplementationOnce(async (_ms, _value, options) => {
    await timers.setTimeout(100, undefined, options)
  })
  const storage = new MemoryStorage()
  const attempts: number[] = []
  const complete = vi.fn(async () => {
    attempts.push(performance.now())
    if (attempts.length === 1) {
      throw new TypeError('fetch failed')
    }
    return Response.json({ choices: [{ message: { content: 'Done' } }] })
  })
  const context = createAgentContext({
    storage,
    config: { apiKey: 'test', model: 'test' },
    client: { endpoint: 'http://unused.invalid/completions', complete },
  })
  await expect(
    new ChatAgent().run('Hello', 'test-token', context, { stream: false }),
  ).resolves.toMatchObject({ success: true, content: 'Done' })
  expect(complete).toHaveBeenCalledTimes(2)
  expect(delay).toHaveBeenCalledExactlyOnceWith(1000, undefined, {
    signal: expect.any(AbortSignal),
  })
  expect(attempts[1] - attempts[0]).toBeGreaterThanOrEqual(95)
  expect(await storage.read('same-dialogue')).toMatchObject([
    { role: 'user', content: 'Hello' },
    { role: 'assistant', success: true, content: 'Done' },
  ])
})

it('stops after three failed requests and saves the final error once', async () => {
  const storage = new MemoryStorage()
  const complete = vi.fn(async () =>
    Response.json({ error: 'Provider unavailable' }, { status: 503 }),
  )
  const context = createAgentContext({
    storage,
    config: { apiKey: 'test', model: 'test' },
    client: { endpoint: 'http://unused.invalid/completions', complete },
  })
  await expect(
    new ChatAgent().run('Hello', 'test-token', context, { stream: false }),
  ).rejects.toThrow('Provider unavailable')
  expect(complete).toHaveBeenCalledTimes(3)
  expect(await storage.read('same-dialogue')).toMatchObject([
    { role: 'user' },
    { role: 'assistant', success: false },
  ])
})

it('does not retry after emitting partial content', async () => {
  const complete = vi.fn(
    async () =>
      new Response(
        'data: {"choices":[{"delta":{"content":"Partial"}}]}\n\ndata: {"error":{"message":"Stream failed"}}\n\n',
        { headers: { 'Content-Type': 'text/event-stream' } },
      ),
  )
  const context = createAgentContext({
    storage: new MemoryStorage(),
    config: { apiKey: 'test', model: 'test' },
    client: { endpoint: 'http://unused.invalid/completions', complete },
  })
  await expect(
    new ChatAgent().run('Hello', 'test-token', context),
  ).rejects.toThrow('Stream failed')
  expect(complete).toHaveBeenCalledTimes(1)
  expect(delay).not.toHaveBeenCalled()
})
