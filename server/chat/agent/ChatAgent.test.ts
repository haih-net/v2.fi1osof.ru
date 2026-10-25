import { expect, it, vi } from 'vitest'
import { ChatAgent } from './ChatAgent'
import {
  createAgentContext,
  type AgentContext,
  type AgentRunContext,
} from './context'
import { MemoryStorage } from '../testing/MemoryStorage'
import { ToolRegistry } from '../tools/registry'
import type { ChatTool, ToolCall } from '../types'
import type { CompletionRequest } from '../../llm/client'

const call: ToolCall = {
  id: 'outer-call',
  type: 'function',
  function: {
    name: 'outer',
    arguments: JSON.stringify({ reasoning: 'Inspect shared state' }),
  },
}

function completion(content: string): Response {
  return Response.json({ id: 'answer', choices: [{ message: { content } }] })
}

function context(storage: MemoryStorage): AgentRunContext<MemoryStorage> {
  return createAgentContext({
    storage,
    config: { apiKey: 'test', model: 'test', toolExplanations: false },
    client: {
      endpoint: 'http://unused.invalid/completions',
      complete: async () => completion('Done'),
    },
  })
}

it('runs without HTTP and shares context and custom storage with nested tools', async () => {
  const storage = new MemoryStorage()
  const seen: AgentContext<MemoryStorage>[] = []
  const inner: ChatTool<MemoryStorage> = {
    definition: {
      type: 'function',
      function: {
        name: 'inner',
        description: 'Read state',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
          additionalProperties: false,
        },
      },
    },
    prepare: ({ reasoning }) => ({
      reasoning,
      execute: async (context) => {
        seen.push(context)
        context.storage.values.set('nested', 'saved')
        return JSON.stringify({ value: context.storage.values.get('outer') })
      },
    }),
  }
  const outer: ChatTool<MemoryStorage> = {
    ...inner,
    definition: {
      ...inner.definition,
      function: { ...inner.definition.function, name: 'outer' },
    },
    prepare: ({ reasoning }) => ({
      reasoning,
      execute: async (context) => {
        seen.push(context)
        context.storage.values.set('outer', 'shared')
        return context.tools
          .prepare({ ...call, function: { ...call.function, name: 'inner' } })
          .execute(context)
      },
    }),
  }
  const runContext = context(storage)
  runContext.tools = new ToolRegistry([outer, inner])
  runContext.client.complete = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        choices: [{ message: { content: null, tool_calls: [call] } }],
      }),
    )
    .mockImplementationOnce(async (request: CompletionRequest) => {
      expect(request.messages.at(-1)).toMatchObject({
        role: 'tool',
        content: '{"value":"shared"}',
      })
      return completion('Done')
    })
  runContext.receive = async (message, current) => {
    seen.push(current)
    await current.storage.append(current.chatId, message)
  }
  const events: string[] = []
  const result = await new ChatAgent().run('Start', 'test-token', runContext, {
    stream: false,
    onEvent: (event) => {
      if (event.type === 'content') {
        events.push(event.content)
      }
    },
  })
  expect(result.content).toBe('Done')
  expect(events).toEqual(['Done'])
  expect(seen).toHaveLength(3)
  expect(seen.every((item) => item === seen[0])).toBe(true)
  expect(seen[0].storage).toBe(storage)
  expect(storage.values.get('nested')).toBe('saved')
  expect((await storage.read('same-dialogue')).map(({ role }) => role)).toEqual(
    ['user', 'tool_call', 'tool', 'assistant'],
  )
})

it('isolates concurrent runs using different storage instances', async () => {
  const agent = new ChatAgent()
  const first = context(new MemoryStorage())
  const second = context(new MemoryStorage())
  const results = await Promise.all([
    agent.run('First', 'test-token', first, { stream: false }),
    agent.run('Second', 'test-token', second, { stream: false }),
  ])
  expect(results.every(({ success }) => success)).toBe(true)
  expect((await first.storage.read('same-dialogue'))[0].content).toBe('First')
  expect((await second.storage.read('same-dialogue'))[0].content).toBe('Second')
})

it('propagates cancellation, records failure and releases the dialogue', async () => {
  const agent = new ChatAgent()
  const runContext = context(new MemoryStorage())
  const controller = new AbortController()
  runContext.signal = controller.signal
  let started!: () => void
  const ready = new Promise<void>((resolve) => {
    started = resolve
  })
  runContext.client.complete = async (_request, signal) => {
    if (!signal) {
      throw new Error('Missing run signal')
    }
    started()
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      })
    })
  }
  const pending = agent.run('Cancel me', 'test-token', runContext, {
    stream: false,
  })
  const assertion = expect(pending).rejects.toThrow('Stopped')
  await ready
  controller.abort(new Error('Stopped'))
  await assertion
  const messages = await runContext.storage.read('same-dialogue')
  expect(messages.at(-1)?.success).toBe(false)
  expect(JSON.parse(messages.at(-1)?.content ?? '{}').abortReason).toBe(
    'disconnect',
  )
  const next = context(runContext.storage)
  await expect(
    agent.run('Retry', 'test-token', next, { stream: false }),
  ).resolves.toMatchObject({ success: true })
})

it('returns a missing GraphQL endpoint error to the model and continues', async () => {
  const runContext = context(new MemoryStorage())
  runContext.client.complete = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  ...call,
                  function: {
                    name: 'graphql_request',
                    arguments: JSON.stringify({
                      reasoning: 'Inspect site',
                      query: '{ __typename }',
                    }),
                  },
                },
              ],
            },
          },
        ],
      }),
    )
    .mockImplementationOnce(async (request: CompletionRequest) => {
      expect(request.messages.at(-1)).toMatchObject({
        role: 'tool',
        content: JSON.stringify({
          error: 'GraphQL endpoint is not configured',
        }),
      })
      return completion('The site API is unavailable.')
    })
  const result = await new ChatAgent().run(
    'Inspect the site',
    'test-token',
    runContext,
    {
      stream: false,
    },
  )
  expect(result.content).toBe('The site API is unavailable.')
  const messages = await runContext.storage.read('same-dialogue')
  expect(messages.find(({ role }) => role === 'tool')?.success).toBe(false)
  expect(messages.at(-1)?.success).toBe(true)
})

it.each([undefined, '', 'invalid-token', 'same-dialogue'])(
  'rejects unauthenticated direct runs before accessing history: %s',
  async (token) => {
    const runContext = context(new MemoryStorage())
    const read = vi.spyOn(runContext.storage, 'read')
    const append = vi.spyOn(runContext.storage, 'append')
    const complete = vi.spyOn(runContext.client, 'complete')
    await expect(
      new ChatAgent().run('Hello', token, runContext),
    ).rejects.toMatchObject({ status: 401 })
    expect(read).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
    expect(complete).not.toHaveBeenCalled()
  },
)

it('derives the dialogue from the verified token, ignoring caller-supplied IDs', async () => {
  const runContext = {
    ...context(new MemoryStorage()),
    chatId: 'another-dialogue',
  }
  const verify = vi.spyOn(runContext.storage, 'verify')
  await new ChatAgent().run('Hello', 'test-token', runContext, {
    stream: false,
  })
  expect(verify).toHaveBeenCalledExactlyOnceWith('Bearer test-token')
  expect(await runContext.storage.read('another-dialogue')).toEqual([])
  expect(await runContext.storage.read('same-dialogue')).toHaveLength(2)
})
