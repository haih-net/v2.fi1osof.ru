// @vitest-environment jsdom
import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { ChatProvider, useChatContext } from '.'
import { sendMessageStream } from '../../lib/streamClient'
import { recordStatistics } from 'app/components/Statistics'

vi.mock('../../lib/streamClient', () => ({ sendMessageStream: vi.fn() }))
vi.mock('app/components/Statistics', () => ({
  recordStatistics: vi.fn(),
}))
vi.mock('app/Custom/hooks/useSnackbar', () => ({ useSnackbar: () => null }))
vi.mock('react-router', () => ({ useLocation: () => ({ pathname: '/ai' }) }))
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ChatProvider>{children}</ChatProvider>
)
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

it.each(['callback', 'throw', 'partial', 'abort', 'success'])(
  'handles %s and correlates statistics',
  async (mode) => {
    vi.mocked(sendMessageStream).mockImplementation(
      async (_text, _session, callbacks) => {
        if (mode === 'success') {
          callbacks.onChunk('От')
          callbacks.onChunk('вет')
          callbacks.onDone()
          return
        }
        if (mode === 'partial') {
          callbacks.onChunk('Часть ответа')
        }
        const error = new Error('offline')
        if (mode === 'abort') {
          error.name = 'AbortError'
        }
        if (mode === 'throw') {
          throw error
        }
        callbacks.onError(error)
      },
    )
    const { result } = renderHook(useChatContext, { wrapper })
    await act(async () => {
      await result.current.submitMessage('  Вопрос  ')
    })
    expect(recordStatistics).toHaveBeenCalledWith(
      'chat.message.sent',
      expect.objectContaining({
        message: 'Вопрос',
        sessionId: expect.any(String),
      }),
    )
    const failed = !['abort', 'success'].includes(mode)
    expect(recordStatistics).toHaveBeenCalledTimes(mode === 'abort' ? 1 : 2)
    expect(
      result.current.messages.filter(
        (m) => m.text === 'Что-то пошло не так. Попробуйте ещё раз.',
      ),
    ).toHaveLength(failed ? 1 : 0)
    if (mode === 'success') {
      expect(recordStatistics).toHaveBeenLastCalledWith(
        'chat.message.received',
        expect.objectContaining({
          ...vi.mocked(recordStatistics).mock.calls[0][1],
          response: 'Ответ',
          responseLength: 5,
        }),
      )
      expect(result.current.messages[1].text).toBe('Ответ')
    }
    if (failed) {
      const calls = vi.mocked(recordStatistics).mock.calls
      expect(calls[1][1].messageId).toBe(calls[0][1].messageId)
      expect(result.current.messages).toHaveLength(2)
    }
    expect(result.current.isLoading).toBe(false)
  },
)

it('does not send or log blank messages', async () => {
  const { result } = renderHook(useChatContext, { wrapper })
  await act(async () => {
    await result.current.submitMessage('   ')
  })
  expect(recordStatistics).not.toHaveBeenCalled()
  expect(sendMessageStream).not.toHaveBeenCalled()
})

it.each(['empty', 'duplicate', 'long', 'cancelled', 'error-then-done'])(
  'records completed responses correctly: %s',
  async (mode) => {
    vi.mocked(sendMessageStream).mockImplementation(
      async (_text, _session, callbacks, signal) => {
        if (mode !== 'empty') {
          callbacks.onChunk(mode === 'long' ? 'я'.repeat(700) : 'Ответ')
        }
        if (mode === 'cancelled') {
          act(() => result.current.stopStreaming())
          expect(signal?.aborted).toBe(true)
        }
        if (mode === 'error-then-done') {
          callbacks.onError(new Error('offline'))
        }
        callbacks.onDone()
        if (mode === 'duplicate') {
          callbacks.onDone()
        }
      },
    )
    const { result } = renderHook(useChatContext, { wrapper })
    await act(async () => {
      await result.current.submitMessage('Вопрос')
    })
    const responses = vi
      .mocked(recordStatistics)
      .mock.calls.filter(([event]) => event === 'chat.message.received')
    expect(responses).toHaveLength(['duplicate', 'long'].includes(mode) ? 1 : 0)
    if (mode === 'long') {
      expect(responses[0][1]).toMatchObject({
        response: 'я'.repeat(700),
        responseLength: 700,
      })
      expect(result.current.messages[1].text).toHaveLength(700)
    }
  },
)

it('preserves the complete question and error in statistics', async () => {
  const message = 'Вопрос '.repeat(1000)
  const error = 'Ошибка '.repeat(1000)
  vi.mocked(sendMessageStream).mockImplementation(
    async (_text, _session, callbacks) => {
      callbacks.onError(new Error(error))
    },
  )
  const { result } = renderHook(useChatContext, { wrapper })
  await act(async () => {
    await result.current.submitMessage(message)
  })
  expect(recordStatistics).toHaveBeenNthCalledWith(
    1,
    'chat.message.sent',
    expect.objectContaining({ message: message.trim() }),
  )
  expect(recordStatistics).toHaveBeenLastCalledWith(
    'chat.message.error',
    expect.objectContaining({
      message: message.trim(),
      status: 'failed',
      error: { name: 'Error', message: error },
    }),
  )
})

it('поздняя ошибка отменённого запроса не останавливает новый ответ', async () => {
  const callbacks: Parameters<typeof sendMessageStream>[2][] = []
  vi.mocked(sendMessageStream).mockImplementation(
    async (_text, _session, callback) => {
      callbacks.push(callback)
    },
  )
  const { result } = renderHook(useChatContext, { wrapper })
  await act(async () => {
    await result.current.submitMessage('Первый')
  })
  act(() => result.current.stopStreaming())
  await act(async () => {
    await result.current.submitMessage('Второй')
  })
  act(() => callbacks[0].onError(new DOMException('Отменено', 'AbortError')))
  expect(result.current.isLoading).toBe(true)
  act(() => {
    callbacks[1].onChunk('Новый ответ')
    callbacks[1].onDone()
  })
  expect(result.current.messages.at(-1)?.text).toBe('Новый ответ')
  expect(result.current.isLoading).toBe(false)
})
