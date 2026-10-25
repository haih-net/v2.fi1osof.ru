import { chatErrorMessage } from '../../../../app/Custom/components/Chat/lib/errors'
import { readCompletionStream } from '../../../../app/Custom/components/Chat/lib/completionStream'
import { collectToolCalls } from '../../toolCalls'
import type { TokenUsage } from '../../storage'
import type { ToolCall } from '../../types'

interface RoundInput {
  upstream: Response
  stream: boolean
  usage: TokenUsage
  onId: (id: string) => void
  onResponseBody: (body: string) => void
  onContent: (content: string) => Promise<void>
}

export async function readRound({
  upstream,
  stream,
  usage,
  onId,
  onResponseBody,
  onContent,
}: RoundInput): Promise<{ content: string; calls: ToolCall[] }> {
  const roundUsage: TokenUsage = {}
  let roundContent = ''
  const calls: ToolCall[] = []
  let receivedId = false
  const onMetadata = (metadata: { id?: string }): void => {
    if (
      !receivedId &&
      metadata.id &&
      /^[a-zA-Z0-9_.:-]{1,256}$/.test(metadata.id)
    ) {
      onId(metadata.id)
      receivedId = true
    }
  }
  const onUsage = (value: unknown): void => {
    if (!value || typeof value !== 'object') {
      return
    }
    const raw = value as Record<string, unknown>
    const details = raw.prompt_tokens_details
    const counters: Record<keyof TokenUsage, unknown> = {
      inputTokens: raw.prompt_tokens,
      cachedTokens:
        details && typeof details === 'object' && 'cached_tokens' in details
          ? details.cached_tokens
          : undefined,
      outputTokens: raw.completion_tokens,
    }
    for (const key of Object.keys(counters) as (keyof TokenUsage)[]) {
      const count = counters[key]
      if (
        typeof count !== 'number' ||
        !Number.isSafeInteger(count) ||
        count < 0
      ) {
        continue
      }
      usage[key] = (usage[key] ?? 0) + count - (roundUsage[key] ?? 0)
      roundUsage[key] = count
    }
  }
  const appendContent = async (content: string): Promise<void> => {
    roundContent += content
    await onContent(content)
  }
  if (stream) {
    if (!upstream.body) {
      throw new Error('Провайдер не вернул потоковый ответ')
    }
    for await (const content of readCompletionStream(
      upstream.body,
      onMetadata,
      (delta) => collectToolCalls(calls, delta),
      onUsage,
    )) {
      await appendContent(content)
    }
  } else {
    const responseBody = await upstream.text()
    onResponseBody(responseBody)
    const result: unknown = JSON.parse(responseBody)
    if (!result || typeof result !== 'object') {
      throw new Error('Некорректный ответ модели')
    }
    if ('error' in result && result.error) {
      throw new Error(
        chatErrorMessage(result.error, 'Ошибка при генерации ответа'),
        {
          cause: result.error,
        },
      )
    }
    onMetadata({
      id:
        'id' in result && typeof result.id === 'string' ? result.id : undefined,
    })
    onUsage('usage' in result ? result.usage : undefined)
    const choice: unknown =
      'choices' in result && Array.isArray(result.choices)
        ? result.choices[0]
        : undefined
    if (
      !choice ||
      typeof choice !== 'object' ||
      !('message' in choice) ||
      !choice.message ||
      typeof choice.message !== 'object'
    ) {
      throw new Error('Некорректный ответ модели')
    }
    if ('finish_reason' in choice && choice.finish_reason === 'error') {
      throw new Error('Ответ модели прерван', { cause: result })
    }
    const message = choice.message
    if (
      'tool_calls' in message &&
      message.tool_calls !== null &&
      message.tool_calls !== undefined
    ) {
      if (!Array.isArray(message.tool_calls)) {
        throw new Error('Некорректные вызовы инструментов')
      }
      collectToolCalls(
        calls,
        message.tool_calls.map((call: unknown, index: number) => {
          if (
            !call ||
            typeof call !== 'object' ||
            !('type' in call) ||
            call.type !== 'function'
          ) {
            throw new Error('Некорректный вызов инструмента')
          }
          return { ...call, index }
        }),
      )
    }
    const content = 'content' in message ? message.content : undefined
    if (typeof content === 'string') {
      await appendContent(content)
    } else if ((content !== null && content !== undefined) || !calls.length) {
      throw new Error('Некорректное содержимое ответа модели')
    }
  }
  return { content: roundContent, calls }
}
