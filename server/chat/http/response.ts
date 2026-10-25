import { once } from 'node:events'
import type { Response } from 'express'
import { chatErrorMessage } from '../../../app/Custom/components/Chat/lib/errors'
import { AgentError } from '../agent/errors'
import type { AgentEvent, AgentResult } from '../agent/types'

export interface ChatResponse {
  event: (event: AgentEvent, signal: AbortSignal) => Promise<void>
  finish: (result: AgentResult) => Promise<void>
  fail: (error: unknown) => void
}

export function createChatResponse(
  res: Response,
  stream: boolean,
  signal: AbortSignal,
): ChatResponse {
  const write = async (
    data: string,
    writeSignal: AbortSignal = signal,
  ): Promise<void> => {
    writeSignal.throwIfAborted()
    if (!res.write(`data: ${data}\n\n`)) {
      await once(res, 'drain', { signal: writeSignal })
    }
  }
  return {
    event: async (event, runSignal) => {
      if (!stream) {
        return
      }
      if (event.type === 'ready' && !res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()
      } else if (event.type === 'content') {
        await write(
          JSON.stringify({ choices: [{ delta: { content: event.content } }] }),
          runSignal,
        )
      }
    },
    finish: async (result) => {
      if (!stream) {
        res.json(result)
        return
      }
      await write(
        JSON.stringify({
          id: result.id,
          usage: {
            prompt_tokens: result.usage.inputTokens,
            prompt_tokens_details: { cached_tokens: result.usage.cachedTokens },
            completion_tokens: result.usage.outputTokens,
          },
          choices: [],
        }),
      )
      await write('[DONE]')
      res.end()
    },
    fail: (error) => {
      if (res.destroyed) {
        return
      }
      const message = chatErrorMessage(error, 'Не удалось связаться с моделью')
      const id = error instanceof AgentError ? error.answerId : undefined
      const code = error instanceof AgentError ? error.code : undefined
      if (res.headersSent) {
        res.end(
          `data: ${JSON.stringify({ id, success: false, error: { message } })}\n\n`,
        )
      } else {
        res
          .status(error instanceof AgentError ? error.status : 502)
          .json(
            id
              ? { error: message, id, success: false, code }
              : { error: message, code },
          )
      }
    },
  }
}
