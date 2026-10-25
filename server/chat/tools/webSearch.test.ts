import { createToolContext as createAgentContext } from '../testing/context'
import { MemoryStorage } from '../testing/MemoryStorage'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { prepareTool } from './registry'

const prepare = (extra: Record<string, unknown> = {}) =>
  prepareTool({
    id: 'search-1',
    type: 'function',
    function: {
      name: 'web_search',
      arguments: JSON.stringify({
        reasoning: 'Check external reviews',
        query: 'Example product independent reviews',
        ...extra,
      }),
    },
  })
const signal = new AbortController().signal
const context = () =>
  createAgentContext({
    storage: new MemoryStorage(),
    chatId: 'search',
    endpoint: 'http://unused.invalid/api',
    signal,
  })
beforeEach(() => {
  vi.stubEnv('CHAT_API_BASE_URL', 'https://provider.example/v1')
  vi.stubEnv('CHAT_MODEL', 'chat-model')
  vi.stubEnv('CHAT_WEB_SEARCH_MODEL', 'search-model')
  vi.stubEnv('CHAT_WEB_SEARCH_TOOL', 'polza:web_search')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('uses the shared provider and configured search model and preserves citations and provider IDs', async () => {
  vi.stubEnv('CHAT_API_KEY', 'test-key')
  const annotations = [
    {
      type: 'url_citation',
      url_citation: { url: 'https://example.org/reviews', title: 'Reviews' },
    },
  ]
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json(
      {
        id: 'search-generation',
        choices: [
          {
            finish_reason: 'stop',
            message: { content: 'Summary', annotations },
          },
        ],
        usage: { server_tool_use: { web_search_requests: 1 } },
      },
      { headers: { 'x-request-id': 'search-request' } },
    ),
  )
  const output = JSON.parse(
    await prepare({ max_uses: 2, allowed_domains: ['example.org'] }).execute(
      context(),
    ),
  )
  expect(output).toMatchObject({
    content: 'Summary',
    annotations,
    id: 'search-generation',
    requestId: 'search-request',
  })
  expect(fetchSpy).toHaveBeenCalledWith(
    'https://provider.example/v1/chat/completions',
    expect.objectContaining({
      signal,
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
    }),
  )
  const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
  expect(body).toMatchObject({
    model: 'search-model',
    stream: false,
    tools: [
      {
        type: 'polza:web_search',
        parameters: {
          max_uses: 2,
          allowed_domains: ['example.org'],
        },
      },
    ],
  })
})

it.each([
  { max_uses: 0 },
  { max_uses: 6 },
  { max_uses: '3' },
  { query: '' },
  { allowed_domains: ['https://example.org'] },
  { reasoning: '' },
])('rejects invalid arguments before searching: %j', (args) => {
  expect(() => prepare(args)).toThrow()
})

it.each([402, 429, 500])(
  'preserves HTTP %i search errors for the dialogue log',
  async (status) => {
    vi.stubEnv('CHAT_API_KEY', 'test-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { error: { message: 'Provider failure', code: status } },
        { status, headers: { 'x-request-id': 'failed-search' } },
      ),
    )
    expect(JSON.parse(await prepare().execute(context()))).toMatchObject({
      error: { message: 'Provider failure' },
      status,
      requestId: 'failed-search',
    })
  },
)

it('does not treat an empty answer as success', async () => {
  vi.stubEnv('CHAT_API_KEY', 'test-key')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({ choices: [{ message: { content: '' } }] }),
  )
  expect(JSON.parse(await prepare().execute(context())).error).toBeTruthy()
})

it('uses the chat model when no separate search model is configured', async () => {
  vi.stubEnv('CHAT_API_KEY', 'test-key')
  vi.stubEnv('CHAT_WEB_SEARCH_MODEL', '')
  const spy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      Response.json({ choices: [{ message: { content: 'Answer' } }] }),
    )
  await prepare().execute(context())
  expect(JSON.parse(spy.mock.calls[0][1]?.body as string).model).toBe(
    'chat-model',
  )
})

it('rejects a missing model before sending credentials', async () => {
  vi.stubEnv('CHAT_API_KEY', 'test-key')
  vi.stubEnv('CHAT_WEB_SEARCH_MODEL', '')
  vi.stubEnv('CHAT_MODEL', '')
  const spy = vi.spyOn(globalThis, 'fetch')
  await expect(prepare().execute(context())).rejects.toThrow('CHAT_MODEL')
  expect(spy).not.toHaveBeenCalled()
})

it.each([
  { tool: undefined, type: 'openrouter:web_search', engine: 'native' },
  { tool: '', type: 'openrouter:web_search', engine: 'native' },
  {
    tool: 'openrouter:web_search',
    type: 'openrouter:web_search',
    engine: 'native',
  },
  { tool: 'polza:web_search', type: 'polza:web_search', engine: undefined },
])(
  'sends the search parameters for $type (override: $tool)',
  async ({ tool, type, engine }) => {
    vi.stubEnv('CHAT_API_KEY', 'test-key')
    vi.stubEnv('CHAT_WEB_SEARCH_TOOL', tool)
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ choices: [{ message: { content: 'Answer' } }] }),
      )
    await prepare({ max_uses: 1, allowed_domains: ['example.org'] }).execute(
      context(),
    )
    const body = JSON.parse(spy.mock.calls[0][1]?.body as string)
    expect(body.tools).toEqual([
      {
        type,
        parameters: {
          ...(engine ? { engine } : {}),
          max_uses: 1,
          allowed_domains: ['example.org'],
        },
      },
    ])
  },
)
