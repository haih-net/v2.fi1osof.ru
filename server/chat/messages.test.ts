import { randomUUID } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { createDatabase } from '../database'
import { ChatStorage, type StoredMessage } from './storage'
import { createChatMessages } from './messages'
import type { EmailInput } from '../schema/types/ChatMessage/helpers/sendEmail'

const databases: ReturnType<typeof createDatabase>[] = []
const origin = 'https://example.test'
const start = Date.parse('2026-10-19T12:00:00.000Z')
const hour = 3600000
const message = (time: number = start): StoredMessage => ({
  id: randomUUID(),
  role: 'user',
  content: 'Please help with my website',
  createdAt: new Date(time).toISOString(),
  pageUrl: '/pricing',
})

async function setup() {
  const database = createDatabase()
  const usersDatabase = createDatabase()
  databases.push(database, usersDatabase)
  const storage = new ChatStorage(database)
  const chatId = (await storage.issue()).split('.')[0]
  await database('User').insert({
    id: 'wrong-database-admin',
    sudo: 1,
    email: 'wrong@example.test',
  })
  await usersDatabase('User').insert([
    { id: 'first', sudo: 1, email: 'first@example.test' },
    { id: 'second', sudo: 1, email: 'second@example.test' },
    { id: 'without-email', sudo: 1, email: null },
    { id: 'blank-email', sudo: 1, email: ' ' },
    { id: 'visitor', sudo: 0, email: 'visitor@example.test' },
  ])
  const send = vi
    .fn<(input: EmailInput) => Promise<void>>()
    .mockResolvedValue(undefined)
  return {
    storage,
    usersDatabase,
    chatId,
    send,
    service: createChatMessages(storage, usersDatabase, send),
  }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.destroy()))
  vi.unstubAllEnvs()
})

it('notifies every admin with an email once for concurrent first messages', async () => {
  const { storage, chatId, send, service } = await setup()
  const incoming = message()
  await Promise.all([
    service.receive(chatId, incoming, origin),
    service.receive(chatId, message(start + 1), origin),
  ])
  expect(await storage.read(chatId)).toHaveLength(2)
  expect(send).toHaveBeenCalledTimes(2)
  expect(send.mock.calls.map(([input]) => input.to).sort()).toEqual([
    'first@example.test',
    'second@example.test',
  ])
  expect(send.mock.calls[0][0]).toMatchObject({
    id: incoming.id,
    subject: 'New chat conversation',
    text: expect.stringContaining(
      `${origin}/admin-panel/chat/dialogues/${chatId}`,
    ),
  })
  expect(send.mock.calls[0][0].text).toContain(incoming.content)
})

it('uses the last dialogue message and a strict inactivity threshold across service instances', async () => {
  const { storage, usersDatabase, chatId, send } = await setup()
  await storage.append(chatId, message(start))
  await storage.append(chatId, {
    ...message(start + 2 * hour),
    role: 'assistant',
  })
  const service = createChatMessages(
    new ChatStorage(storage.database),
    usersDatabase,
    send,
  )
  // More than three hours since the user message, exactly three since the reply.
  await service.receive(chatId, message(start + 5 * hour), origin)
  expect(send).not.toHaveBeenCalled()
  await service.receive(chatId, message(start + 8 * hour + 1), origin)
  expect(send).toHaveBeenCalledTimes(2)
  expect(send.mock.calls[0][0].subject).toBe('Chat conversation resumed')
})

it('supports a custom interval and disables only chat notifications', async () => {
  const { storage, chatId, send, service } = await setup()
  vi.stubEnv('CHAT_EMAIL_NOTIFICATIONS_ENABLED', 'false')
  await service.receive(chatId, message(), origin)
  expect(send).not.toHaveBeenCalled()
  vi.stubEnv('CHAT_EMAIL_NOTIFICATIONS_ENABLED', 'true')
  vi.stubEnv('CHAT_EMAIL_NOTIFICATIONS_INTERVAL_HOURS', '0.5')
  await service.receive(chatId, message(start + hour), origin)
  expect(send).toHaveBeenCalledTimes(2)
  const feedbackId = (await storage.issue('feedback')).split('.')[0]
  await service.receive(feedbackId, message(), origin)
  expect(send).toHaveBeenCalledTimes(2)
  expect(await storage.read(feedbackId)).toHaveLength(1)
})

it('does not await SMTP and isolates a failed recipient from other admins', async () => {
  const { storage, chatId, send, service } = await setup()
  const failure = new Error('SMTP unavailable')
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  let finish: (() => void) | undefined
  send.mockRejectedValueOnce(failure).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  try {
    await service.receive(chatId, message(), origin)
    expect(send).toHaveBeenCalledTimes(2)
    expect(await storage.read(chatId)).toHaveLength(1)
    expect(log).toHaveBeenCalledWith(
      'Chat notification delivery failed',
      expect.objectContaining({ chatId, to: 'first@example.test' }),
      failure,
    )
  } finally {
    finish?.()
  }
})

it('does not notify when message persistence fails', async () => {
  const { storage, chatId, send, service } = await setup()
  vi.spyOn(storage, 'appendUserMessage').mockRejectedValueOnce(
    new Error('disk full'),
  )
  await expect(service.receive(chatId, message(), origin)).rejects.toThrow(
    'disk full',
  )
  expect(send).not.toHaveBeenCalled()
  expect(await storage.read(chatId)).toEqual([])
})
