import { createToolContext as createAgentContext } from '../../server/chat/testing/context'
import { MemoryStorage } from '../../server/chat/testing/MemoryStorage'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webSearchTool } from '../../server/chat/tools/webSearch'

interface SearchResult {
  error?: unknown
  status?: number
  requestId?: string
  content?: string
  annotations?: { type: string; url_citation?: { url?: string } }[]
  usage?: {
    server_tool_use?: { web_search_requests?: number }
    server_tool_use_details?: { web_search_requests?: number }
  }
}

const providers = [
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1',
    key: 'OPENROUTER_API_KEY',
    tool: undefined,
  },
  {
    name: 'Polza',
    url: 'https://polza.ai/api/v1',
    key: 'POLZA_API_KEY',
    tool: 'polza:web_search',
  },
] as const

for (const provider of providers) {
  test(
    `${provider.name}: live web search returns citations and search usage`,
    { timeout: 120000 },
    async (context) => {
      const key = process.env[provider.key]
      assert.ok(key, `${provider.key} is required`)
      const overrides = {
        CHAT_API_BASE_URL: provider.url,
        CHAT_API_KEY: key,
        CHAT_MODEL: 'anthropic/claude-haiku-4.5',
        CHAT_WEB_SEARCH_MODEL: '',
        CHAT_WEB_SEARCH_TOOL: provider.tool,
      }
      const previous = new Map(
        Object.keys(overrides).map((name) => [name, process.env[name]]),
      )
      try {
        for (const [name, value] of Object.entries(overrides)) {
          if (value === undefined) {
            delete process.env[name]
          } else {
            process.env[name] = value
          }
        }
        const result: SearchResult = JSON.parse(
          await webSearchTool
            .prepare({
              reasoning: 'Verify live web search',
              query:
                'Найди через поиск последнюю публикацию о выпуске Node.js на nodejs.org/en/blog/release. Укажи версию, дату и прямую ссылку. Обязательно выполни один поиск, не отвечай по памяти.',
              max_uses: 1,
              allowed_domains: ['nodejs.org'],
            })
            .execute(
              createAgentContext({
                storage: new MemoryStorage(),
                chatId: 'live-search',
                endpoint: 'http://unused.invalid/api',
                signal: AbortSignal.timeout(110000),
              }),
            ),
        )
        assert.ok(
          !result.error,
          `${provider.name}: ${JSON.stringify({ error: result.error, status: result.status, requestId: result.requestId })}`,
        )
        assert.ok(result.content?.trim(), 'Expected a nonempty answer')
        assert.ok(
          result.annotations?.some(
            (item) =>
              item.type === 'url_citation' &&
              item.url_citation?.url?.startsWith('https://'),
          ),
          'Expected source citations',
        )
        const searchRequests =
          result.usage?.server_tool_use?.web_search_requests ??
          result.usage?.server_tool_use_details?.web_search_requests ??
          0
        assert.ok(searchRequests > 0, 'Expected evidence of an executed search')
        context.diagnostic(
          `${provider.name}: search requests=${searchRequests}, citations=${result.annotations?.length}`,
        )
      } finally {
        for (const [name, value] of previous) {
          if (value === undefined) {
            delete process.env[name]
          } else {
            process.env[name] = value
          }
        }
      }
    },
  )
}
