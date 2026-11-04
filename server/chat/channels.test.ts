import Database from 'better-sqlite3'
import { afterEach, expect, it } from 'vitest'
import { initializeSchema } from '../database/schema'
import { createDatabase } from '../database'
import { ChatStorage } from './storage'

const databases: ReturnType<typeof createDatabase>[] = []
afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.destroy()))
})
it('migrates existing dialogues to chat without changing messages', () => {
  const db = new Database(':memory:')
  try {
    initializeSchema(db)
    db.exec(`DROP TABLE PageErrorEvent;
      DROP TABLE PageError;
      DROP TABLE EthTransaction;
      DROP TABLE "Transaction";
      DROP INDEX TelegramAccount_externalKey;
      ALTER TABLE TelegramAccount DROP COLUMN externalKey;
      DROP TABLE ChatMessage;
      DROP TABLE ChatDialogue;
      CREATE TABLE ChatDialogue (chatId TEXT PRIMARY KEY, createdAt INTEGER NOT NULL);
      CREATE TABLE ChatMessage (payload TEXT);
      INSERT INTO ChatDialogue VALUES ('existing', 1);
      INSERT INTO ChatMessage VALUES ('original');
      PRAGMA user_version = 2;`)
    initializeSchema(db)
    initializeSchema(db)
    expect(db.prepare('SELECT channel FROM ChatDialogue').get()).toEqual({
      channel: 'chat',
    })
    expect(db.prepare('SELECT payload FROM ChatMessage').get()).toEqual({
      payload: 'original',
    })
    expect(db.pragma('user_version', { simple: true })).toBe(6)
  } finally {
    db.close()
  }
})
it('persists the selected channel and defaults old callers to chat', async () => {
  const database = createDatabase()
  databases.push(database)
  const storage = new ChatStorage(database)
  const chat = (await storage.issue()).split('.')[0]
  const feedback = (await storage.issue('feedback')).split('.')[0]
  const restored = new ChatStorage(database)
  expect(await restored.listDialogues()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ chatId: chat, channel: 'chat' }),
      expect.objectContaining({ chatId: feedback, channel: 'feedback' }),
    ]),
  )
})
