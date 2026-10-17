export async function* readCompletionStream(
  body: ReadableStream<Uint8Array>,
  onMetadata?: (metadata: { id?: string; created?: number }) => void,
  onToolCalls?: (delta: unknown) => void,
  onUsage?: (usage: unknown) => void,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let data: string[] = []
  let completed = false
  const event = (): string | undefined => {
    const payload = data.join('\n')
    data = []
    if (!payload) {
      return
    }
    if (payload === '[DONE]') {
      completed = true
      return
    }
    const value: unknown = JSON.parse(payload)
    if (!value || typeof value !== 'object') {
      throw new Error('Некорректный ответ модели')
    }
    if ('usage' in value && value.usage) {
      onUsage?.(value.usage)
    }
    onMetadata?.({
      id: 'id' in value && typeof value.id === 'string' ? value.id : undefined,
      created:
        'created' in value && typeof value.created === 'number'
          ? value.created
          : undefined,
    })
    if ('error' in value && value.error) {
      throw new Error('Ошибка при генерации ответа', { cause: value.error })
    }
    if (!('choices' in value) || !Array.isArray(value.choices)) {
      return
    }
    const choice: unknown = value.choices[0]
    if (!choice || typeof choice !== 'object') {
      return
    }
    if ('finish_reason' in choice && choice.finish_reason === 'error') {
      throw new Error('Ответ модели прерван', { cause: value })
    }
    if (
      !('delta' in choice) ||
      !choice.delta ||
      typeof choice.delta !== 'object'
    ) {
      return
    }
    if ('tool_calls' in choice.delta) {
      onToolCalls?.(choice.delta.tool_calls)
    }
    const content: unknown =
      'content' in choice.delta ? choice.delta.content : undefined
    return typeof content === 'string' ? content : undefined
  }
  try {
    while (!completed) {
      const { done, value } = await reader.read()
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true })
      if (buffer.length > 1_000_000) {
        throw new Error('Слишком большой фрагмент ответа')
      }
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (line === '') {
          const text = event()
          if (text) {
            yield text
          }
          if (completed) {
            break
          }
        } else if (line.startsWith('data:')) {
          data.push(line.slice(5).replace(/^ /, ''))
        }
      }
      if (done) {
        if (buffer.startsWith('data:')) {
          data.push(buffer.slice(5).replace(/^ /, '').replace(/\r$/, ''))
        }
        const text = event()
        if (text) {
          yield text
        }
        if (!completed) {
          throw new Error('Соединение прервано до завершения ответа')
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
