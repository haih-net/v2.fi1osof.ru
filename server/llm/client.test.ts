import { createServer } from 'node:http'
import { once } from 'node:events'
import { expect, it } from 'vitest'
import { LlmClient } from './client'

it('isolates concurrent models, messages and cancellation on one client', async () => {
  const received: { model: string; messages: { content: string }[] }[] = []
  const server = createServer(async (req, res) => {
    expect(req.headers.authorization).toBe('Bearer test-secret')
    expect(req.url).toBe('/v1/chat/completions')
    let text = ''
    for await (const chunk of req) {
      text += chunk
    }
    const body = JSON.parse(text) as (typeof received)[number]
    received.push(body)
    if (body.model === 'cancel') {
      return
    }
    res.writeHead(200, {
      'Content-Type':
        body.model === 'stream' ? 'text/event-stream' : 'application/json',
    })
    res.end(body.model === 'stream' ? 'data: [DONE]\n\n' : JSON.stringify(body))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing address')
  }
  const client = new LlmClient(() => ({
    baseUrl: `http://127.0.0.1:${address.port}/v1/`,
    apiKey: 'test-secret',
  }))
  try {
    const [json, stream] = await Promise.all([
      client.complete({
        model: 'search',
        messages: [{ role: 'user', content: 'first' }],
      }),
      client.complete({
        model: 'stream',
        messages: [{ role: 'user', content: 'second' }],
        stream: true,
      }),
    ])
    expect((await json.json()).messages[0].content).toBe('first')
    expect(await stream.text()).toBe('data: [DONE]\n\n')
    await expect(
      client.complete(
        { model: 'cancel', messages: [] },
        AbortSignal.timeout(50),
      ),
    ).rejects.toThrow()
    const next = await client.complete({ model: 'next', messages: [] })
    expect(next.status).toBe(200)
    expect(received.map(({ model }) => model)).toEqual(
      expect.arrayContaining(['search', 'stream', 'next']),
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

it('returns provider error bodies without replacing diagnostics', async () => {
  const server = createServer((_req, res) => {
    res.writeHead(429, { 'x-request-id': 'rate-limit' })
    res.end('provider details')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Missing address')
  }
  try {
    const client = new LlmClient(() => ({
      baseUrl: `http://127.0.0.1:${address.port}`,
      apiKey: 'test',
    }))
    const response = await client.complete({ model: 'model', messages: [] })
    expect(response.status).toBe(429)
    expect(response.headers.get('x-request-id')).toBe('rate-limit')
    expect(await response.text()).toBe('provider details')
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
