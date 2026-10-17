import { expect, it, vi } from 'vitest'
import { executeGraphql } from './tools/graphqlRequest'
import { prepareTool } from './tools/registry'
import type { ToolCall } from './types'
import { contextMessages } from './storage'

it('requires a purpose before executing a tool', () => {
  const call: ToolCall = {
    id: 'call',
    type: 'function',
    function: {
      name: 'graphql_request',
      arguments: JSON.stringify({ query: '{ __typename }', reasoning: '  ' }),
    },
  }
  expect(() => prepareTool(call)).toThrow('reasoning')
})

it('rejects mutations and ambiguous operations before contacting the API', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  try {
    for (const query of [
      'mutation { signup }',
      'query A { __typename } query B { __typename }',
    ]) {
      await expect(
        executeGraphql(
          { reasoning: 'Check', query },
          'http://127.0.0.1/api',
          new AbortController().signal,
        ),
      ).rejects.toThrow('read-only')
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  } finally {
    fetchSpy.mockRestore()
  }
})

it('preserves completed conversation pairs with intervening tool logs', () => {
  expect(
    contextMessages(
      [
        { role: 'user', content: 'Search' },
        { role: 'tool_call', content: 'query' },
        { role: 'tool', content: 'result' },
        { role: 'assistant', content: 'Answer' },
      ],
      { role: 'user', content: 'Continue' },
    ),
  ).toEqual([
    { role: 'user', content: 'Search' },
    { role: 'assistant', content: 'Answer' },
    { role: 'user', content: 'Continue' },
  ])
})

it('does not use failed answers as successful conversation context', () => {
  expect(
    contextMessages(
      [
        { id: 'question', role: 'user', content: 'Search' },
        {
          role: 'assistant',
          content: 'Provider failed',
          success: false,
          replyToId: 'question',
        },
      ],
      { role: 'user', content: 'Retry' },
    ),
  ).toEqual([{ role: 'user', content: 'Retry' }])
})

it('lists only skill summaries in the system message and reads complete instructions through a tool', async () => {
  const { buildSystemMessage } = await import('./systemMessage')
  const prompt = buildSystemMessage(`Custom assistant instructions`)
  expect(prompt).toContain('Custom assistant instructions')
  expect(prompt).toContain('catalogue-search:')
  expect(prompt).toContain('bathhouse-cards:')
  expect(prompt).not.toContain('query FindBathhouses')
  expect(prompt).not.toContain('<company id=')
  const tool = prepareTool({
    id: 'skill-call',
    type: 'function',
    function: {
      name: 'read_skill',
      arguments: JSON.stringify({
        id: 'catalogue-search',
        reasoning: 'Learn how to search the catalogue',
      }),
    },
  })
  const result = JSON.parse(
    await tool.execute({
      endpoint: 'http://unused.invalid',
      signal: new AbortController().signal,
    }),
  )
  expect(result.id).toBe('catalogue-search')
  expect(result.content).toContain('query FindBathhouses')
})

it('requires reasoning for reading skills and rejects unknown skill IDs', async () => {
  const call = (args: Record<string, unknown>): ToolCall => ({
    id: 'read',
    type: 'function',
    function: { name: 'read_skill', arguments: JSON.stringify(args) },
  })
  expect(() => prepareTool(call({ id: 'catalogue-search' }))).toThrow(
    'reasoning',
  )
  expect(() => prepareTool(call({ id: [], reasoning: 'Read' }))).toThrow(
    'skill id',
  )
  const context = {
    endpoint: 'http://unused.invalid',
    signal: new AbortController().signal,
  }
  await expect(
    prepareTool(call({ id: '../../.env', reasoning: 'Read' })).execute(context),
  ).rejects.toThrow('Unknown skill')
  const cards = JSON.parse(
    await prepareTool(
      call({ id: 'bathhouse-cards', reasoning: 'Show cards' }),
    ).execute(context),
  )
  expect(cards.content).toContain(
    'ОБЯЗАТЕЛЬНО должно присутствовать и быть непустым',
  )
})

it('resolves the current page through the local API without fetching the supplied host', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      Response.json({ data: { concept: { id: 'company-1' } } }),
    )
  try {
    const tool = prepareTool({
      id: 'page',
      type: 'function',
      function: {
        name: 'get_current_page',
        arguments: JSON.stringify({ reasoning: 'Identify this company' }),
      },
    })
    const context = {
      endpoint: 'http://127.0.0.1:3111/api',
      signal: new AbortController().signal,
      pageUrl: 'https://example.org/city/kirov/bath?tab=reviews#review',
    }
    expect(JSON.parse(await tool.execute(context))).toEqual({
      data: { concept: { id: 'company-1' } },
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      context.endpoint,
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      }),
    )
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.variables).toEqual({ uri: '/city/kirov/bath' })
    await expect(
      tool.execute({ ...context, pageUrl: undefined }),
    ).rejects.toThrow('current page URL')
    await expect(
      tool.execute({ ...context, pageUrl: 'file:///etc/passwd' }),
    ).rejects.toThrow('current page URL')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  } finally {
    fetchSpy.mockRestore()
  }
})

it('exposes reviews as a readable skill with the agreed feedback destination', async () => {
  const tool = prepareTool({
    id: 'review',
    type: 'function',
    function: {
      name: 'read_skill',
      arguments: JSON.stringify({
        id: 'company-reviews',
        reasoning: 'Explain feedback',
      }),
    },
  })
  const result = JSON.parse(
    await tool.execute({
      endpoint: 'http://unused.invalid',
      signal: new AbortController().signal,
    }),
  )
  expect(result.content).toContain('Администрация прочтёт и учтёт ваш отзыв')
  expect(result.content).toContain(
    'Не утверждай, что отзыв публично опубликован',
  )
})

it('возвращает сведения о помощнике с готовыми Markdown-ссылками без сетевых запросов', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  try {
    const call: ToolCall = {
      id: 'system-info',
      type: 'function',
      function: {
        name: 'get_system_info',
        arguments: JSON.stringify({
          reasoning: 'Уточню сведения о помощнике.',
        }),
      },
    }
    const tool = prepareTool(call)
    const controller = new AbortController()
    const context = {
      endpoint: 'http://unused.invalid',
      signal: controller.signal,
    }
    const result = JSON.parse(await tool.execute(context))
    expect(result.content).toContain('Ланец Николай, он же Fi1osof')
    expect(result.content).toContain(
      '[https://fi1osof.ru/](https://fi1osof.ru/)',
    )
    expect(result.content).toContain('gemini-3.1-flash-lite')
    expect(result.content).toContain(
      '[https://polza.ai](https://polza.ai/?referral=dX1Tzof3E6)',
    )
    controller.abort()
    await expect(tool.execute(context)).rejects.toThrow()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(() =>
      prepareTool({
        ...call,
        function: { ...call.function, arguments: '{}' },
      }),
    ).toThrow('reasoning')
  } finally {
    fetchSpy.mockRestore()
  }
})
