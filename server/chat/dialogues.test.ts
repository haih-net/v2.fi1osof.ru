import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createDatabase } from '../database'
import { initializeSchema } from '../database/schema'
import { ChatStorage } from './storage'

const databases: ReturnType<typeof createDatabase>[] = []
const directories: string[] = []
const createStorage = (): ChatStorage => {
  const database = createDatabase()
  databases.push(database)
  return new ChatStorage(database)
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.destroy()))
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
  vi.unstubAllEnvs()
})

it('lists empty dialogues newest first with a stable tie breaker', async () => {
  const storage = createStorage()
  expect(await storage.listDialogues()).toEqual([])
  for (const [chatId, createdAt] of [
    ['a'.repeat(48), 1],
    ['b'.repeat(48), 2],
    ['c'.repeat(48), 2],
  ] as const) {
    await storage.database('ChatDialogue').insert({ chatId, createdAt })
  }
  expect((await storage.listDialogues()).map(({ chatId }) => chatId)).toEqual([
    'b'.repeat(48),
    'c'.repeat(48),
    'a'.repeat(48),
  ])
  expect(await storage.read('d'.repeat(48))).toEqual([])
  expect(await storage.listDialogues()).toHaveLength(3)
})

it('persists tokens and history across database reopening', async () => {
  const directory = await mkdtemp('server/database/data/chat-test-')
  directories.push(directory)
  vi.stubEnv('DATABASE_FILENAME', join(directory, 'chat.sqlite'))
  const first = createStorage()
  const token = await first.issue()
  const chatId = token.split('.')[0]
  const message = {
    id: 'message',
    createdAt: new Date().toISOString(),
    role: 'assistant' as const,
    content: 'Answer',
    success: false,
    usage: { cachedTokens: 0 },
    replyToId: 'question',
    pageUrl: '/page',
  }
  await first.append(chatId, message)
  await first.database.destroy()
  const second = createStorage()
  expect(await second.verify(`Bearer ${token}`)).toBe(chatId)
  expect(await second.read(chatId)).toEqual([message])
  expect(await second.listMessages()).toMatchObject([
    { status: 'error', usage: { cachedTokens: 0 } },
  ])
})

it('does not lose concurrent writes from separate database connections', async () => {
  const directory = await mkdtemp('server/database/data/chat-test-')
  directories.push(directory)
  vi.stubEnv('DATABASE_FILENAME', join(directory, 'chat.sqlite'))
  const first = createStorage()
  const second = createStorage()
  const tokens = await Promise.all([first.issue(), second.issue()])
  expect(await second.verify(`Bearer ${tokens[0]}`)).toBe(
    tokens[0].split('.')[0],
  )
  expect(await first.verify(`Bearer ${tokens[1]}`)).toBe(
    tokens[1].split('.')[0],
  )
  const chatId = tokens[0].split('.')[0]
  await Promise.all(
    Array.from({ length: 20 }, (_, index) =>
      (index % 2 ? first : second).append(chatId, {
        id: `message-${index}`,
        createdAt: new Date().toISOString(),
        role: 'user',
        content: String(index),
      }),
    ),
  )
  expect(await first.read(chatId)).toHaveLength(20)
  expect(await second.listMessages()).toHaveLength(20)
  await expect(
    first.save(chatId, [{ role: 'invalid' as 'user', content: 'Broken' }]),
  ).rejects.toThrow()
  expect(await second.read(chatId)).toHaveLength(20)
})

it('upgrades schema version 1 without changing existing records and rejects unknown versions', () => {
  const connection = new Database(':memory:')
  try {
    initializeSchema(connection)
    connection.exec(
      `DROP TABLE ChatMessage; DROP TABLE ChatDialogue; DROP TABLE ChatSetting; PRAGMA user_version = 1; INSERT INTO User (id) VALUES ('existing');`,
    )
    initializeSchema(connection)
    initializeSchema(connection)
    expect(connection.pragma('user_version', { simple: true })).toBe(2)
    expect(connection.prepare('SELECT id FROM User').all()).toEqual([
      { id: 'existing' },
    ])
    expect(connection.prepare('SELECT * FROM ChatDialogue').all()).toEqual([])
    connection.pragma('user_version = 99')
    expect(() => initializeSchema(connection)).toThrow('Unsupported')
  } finally {
    connection.close()
  }
})

it('refuses to replace an active signing key and rolls back the import marker', async () => {
  const root = await mkdtemp('server/database/data/chat-import-')
  directories.push(root)
  await writeFile(join(root, '.signing-key'), Buffer.alloc(32, 9))
  const storage = createStorage()
  const token = await storage.issue()
  expect(
    await storage
      .database('ChatSetting')
      .where({ id: 'legacy-import' })
      .first(),
  ).toBeUndefined()
  expect(await storage.verify(`Bearer ${token}`)).toBe(token.split('.')[0])
})

it('leaves the database untouched when a legacy history is malformed', async () => {
  const root = await mkdtemp('server/database/data/chat-import-')
  directories.push(root)
  await writeFile(join(root, '.signing-key'), Buffer.alloc(32, 9))
  await mkdir(join(root, 'a'.repeat(48)))
  await writeFile(
    join(root, 'a'.repeat(48), 'messages.json'),
    '[{"role":"unknown","content":"bad"}]',
  )
  const storage = createStorage()
  expect(await storage.database('ChatSetting')).toEqual([])
  expect(await storage.listDialogues()).toEqual([])
})
