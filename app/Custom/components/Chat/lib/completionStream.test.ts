import { expect, it } from 'vitest'
import { readCompletionStream } from './completionStream'

const collect = async (source: string, chunkSize = 1): Promise<string> => {
  const bytes = new TextEncoder().encode(source)
  let offset = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close()
        return
      }
      controller.enqueue(bytes.slice(offset, (offset += chunkSize)))
    },
  })
  let result = ''
  for await (const text of readCompletionStream(stream)) {
    result += text
  }
  return result
}

it('собирает UTF-8 и SSE, разделённые по одному байту, игнорирует heartbeat', async () => {
  expect(
    await collect(
      ': heartbeat\r\n\r\ndata: {"choices":[{"delta":{"content":"Привет 🧖"}}]}\r\n\r\ndata: [DONE]\r\n\r\n',
    ),
  ).toBe('Привет 🧖')
})
it.each([
  'data: {"choices":[{"delta":{"content":"Часть"}}]}\n\n',
  'data: {"error":{"message":"failure"}}\n\n',
  'data: {broken}\n\n',
])('не считает оборванный или ошибочный поток успешным', async (source) => {
  await expect(collect(source)).rejects.toThrow()
})
it('принимает завершающий маркер без последнего перевода строки', async () => {
  expect(await collect('data: [DONE]', 20)).toBe('')
})

it('сохраняет исходную ошибку провайдера для серверной диагностики', async () => {
  const cause = { message: 'Provider rejected the model', code: 400 }
  await expect(
    collect(`data: ${JSON.stringify({ error: cause })}\n\n`),
  ).rejects.toMatchObject({
    message: cause.message,
    cause,
  })
})
