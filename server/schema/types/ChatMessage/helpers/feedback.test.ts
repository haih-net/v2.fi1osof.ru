import { errorReporter } from '../../../../errorLogging'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Request } from 'express'
import { createFeedback } from './feedback'
import { createDatabase } from '../../../../database'
import { ChatStorage } from '../../../../chat/storage'

const request = {
  get: () => 'https://example.com',
  socket: { remoteAddress: '127.0.0.1' },
} as unknown as Request
const databases: ReturnType<typeof createDatabase>[] = []
const setup = () => {
  const database = createDatabase()
  databases.push(database)
  const storage = new ChatStorage(database)
  const send = vi.fn().mockResolvedValue(undefined)
  return {
    storage,
    send,
    service: createFeedback(send, Date.now, storage),
  }
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.destroy()))
})
describe('feedback dialogues', () => {
  it('stores one unanswered feedback message and sends repeated submission once', async () => {
    const { storage, send, service } = setup()
    const token = await storage.issue('feedback')
    const input = { token, contacts: '@visitor', message: 'Help with my site' }
    await expect(
      service.submit({ ...input, contacts: ' ' }, request),
    ).rejects.toThrow('Заполните')
    const results = await Promise.all([
      service.submit(input, request),
      service.submit(input, request),
    ])
    expect(results[0]).toBe(results[1])
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toContain('@visitor')
    const chatId = token.split('.')[0]
    expect(await storage.channel(chatId)).toBe('feedback')
    expect(await storage.read(chatId)).toEqual([
      expect.objectContaining({
        role: 'user',
        content: 'Контакты:\n@visitor\n\nСообщение:\nHelp with my site',
      }),
    ])
    const restarted = createFeedback(send, Date.now, storage)
    await restarted.submit(input, request)
    expect(await storage.read(chatId)).toHaveLength(1)
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('rejects chat tokens and forged tokens', async () => {
    const { storage, service, send } = setup()
    const input = { token: await storage.issue(), contacts: 'a', message: 'b' }
    await expect(service.submit(input, request)).rejects.toThrow('токен')
    await expect(
      service.submit({ ...input, token: 'fake' }, request),
    ).rejects.toThrow('токен')
    expect(send).not.toHaveBeenCalled()
    expect(await storage.read(input.token.split('.')[0])).toEqual([])
  })
  it('accepts the message despite SMTP failure and does not duplicate it on retry', async () => {
    const { storage, send, service } = setup()
    const failure = new Error('SMTP unavailable')
    const log = vi
      .spyOn(errorReporter, 'error')
      .mockImplementationOnce(() => undefined)
    send.mockRejectedValueOnce(failure)
    const token = await storage.issue('feedback')
    const input = { token, contacts: '@visitor', message: 'Help' }
    await expect(service.submit(input, request)).resolves.toContain(
      'Сообщение принято',
    )
    expect(await storage.read(token.split('.')[0])).toHaveLength(1)
    await service.submit(input, request)
    expect(await storage.read(token.split('.')[0])).toHaveLength(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Feedback delivery failed',
      failure,
    )
  })
})

it('accepts feedback without mail configuration and without Origin', async () => {
  vi.stubEnv('MAIL_FROM', '')
  vi.stubEnv('MAIL_TO', '')
  const log = vi
    .spyOn(errorReporter, 'error')
    .mockImplementationOnce(() => undefined)
  try {
    const { storage } = setup()
    const service = createFeedback(undefined, Date.now, storage)
    const token = await storage.issue('feedback')
    const req = {
      ...request,
      protocol: 'http',
      get: (name: string) => (name === 'host' ? 'localhost:4319' : undefined),
    } as unknown as Request
    await expect(
      service.submit({ token, contacts: '@visitor', message: 'Hello' }, req),
    ).resolves.toContain('Сообщение принято')
    expect(await storage.read(token.split('.')[0])).toHaveLength(1)
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Feedback delivery failed',
      expect.objectContaining({
        message:
          'Почтовое уведомление не отправлено: не задан MAIL_FROM. Сообщение сохранено в диалоге.',
      }),
    )
  } finally {
    vi.unstubAllEnvs()
  }
})

it('does not wait for SMTP to accept the message', async () => {
  const { storage } = setup()
  let finish: (() => void) | undefined
  const send = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const service = createFeedback(send, Date.now, storage)
  try {
    const token = await storage.issue('feedback')
    await expect(
      service.submit(
        { token, contacts: '@visitor', message: 'Hello' },
        request,
      ),
    ).resolves.toContain('Сообщение принято')
    expect(send).toHaveBeenCalledTimes(1)
  } finally {
    finish?.()
  }
})

it('reports a storage failure and does not attempt mail delivery', async () => {
  const { service, storage, send } = setup()
  const token = await storage.issue('feedback')
  const failure = new Error('disk full')
  const log = vi
    .spyOn(errorReporter, 'error')
    .mockImplementationOnce(() => undefined)
  const append = vi
    .spyOn(storage, 'appendFeedback')
    .mockRejectedValueOnce(failure)
  try {
    await expect(
      service.submit(
        { token, contacts: '@visitor', message: 'Hello' },
        request,
      ),
    ).rejects.toThrow('Не удалось сохранить сообщение в диалоге')
    expect(send).not.toHaveBeenCalled()
    expect(await storage.read(token.split('.')[0])).toEqual([])
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Feedback storage failed',
      failure,
    )
  } finally {
    append.mockRestore()
  }
})
