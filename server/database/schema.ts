import type { Database } from 'better-sqlite3'

export function initializeSchema(connection: Database): void {
  connection
    .transaction(() => {
      const version = connection.pragma('user_version', { simple: true })
      if (version === 3) {
        return
      }
      if (version !== 0 && version !== 1 && version !== 2) {
        throw new Error('Unsupported database schema version')
      }
      if (version === 0) {
        connection.exec(`
      CREATE TABLE "User" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('newbie', 'active', 'blocked')),
        username TEXT UNIQUE, password TEXT, email TEXT UNIQUE,
        fullname TEXT, image TEXT, intro TEXT, content TEXT,
        sudo INTEGER NOT NULL DEFAULT 0 CHECK (sudo IN (0, 1)),
        isAiAgent INTEGER NOT NULL DEFAULT 0 CHECK (isAiAgent IN (0, 1)),
        referrerId TEXT REFERENCES "User"(id)
      );
      CREATE TABLE "Token" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        expiredAt INTEGER,
        userId TEXT REFERENCES "User"(id)
      );
      CREATE INDEX Token_userId ON "Token"(userId);
      CREATE TABLE "EthAccount" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        address TEXT NOT NULL UNIQUE,
        userId TEXT UNIQUE REFERENCES "User"(id)
      );
      CREATE TABLE "TelegramAccount" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        photo_url TEXT, username TEXT,
        userId TEXT NOT NULL UNIQUE REFERENCES "User"(id)
      );
      CREATE TABLE "Balance" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        amount REAL NOT NULL DEFAULT 0,
        userId TEXT NOT NULL UNIQUE REFERENCES "User"(id)
      );
      CREATE TABLE "File" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        path TEXT NOT NULL UNIQUE,
        filename TEXT, name TEXT, description TEXT, content TEXT,
        mimetype TEXT NOT NULL, encoding TEXT NOT NULL,
        hash TEXT UNIQUE, size INTEGER,
        createdById TEXT REFERENCES "User"(id)
      );
      CREATE TABLE "KBConcept" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        name TEXT NOT NULL, type TEXT, uri TEXT UNIQUE,
        description TEXT, intro TEXT, content TEXT, image TEXT,
        createdById TEXT NOT NULL REFERENCES "User"(id),
        code TEXT, parentId TEXT REFERENCES "KBConcept"(id),
        rootId TEXT REFERENCES "KBConcept"(id), path TEXT,
        quality REAL NOT NULL DEFAULT 0,
        visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden', 'unpublished')),
        data TEXT CHECK (data IS NULL OR json_valid(data)), lat REAL, lng REAL
      );
      CREATE INDEX KBConcept_visibility_updatedAt ON "KBConcept"(visibility, updatedAt);
      CREATE TABLE "SiteRoute" (
        id TEXT PRIMARY KEY NOT NULL,
        path TEXT NOT NULL UNIQUE,
        kBConceptId TEXT NOT NULL REFERENCES "KBConcept"(id) ON DELETE CASCADE
      );
      CREATE INDEX SiteRoute_concept ON "SiteRoute"(kBConceptId);
      CREATE TABLE "KBConceptFile" (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        fileId TEXT NOT NULL REFERENCES "File"(id) ON DELETE CASCADE,
        kBConceptId TEXT NOT NULL REFERENCES "KBConcept"(id) ON DELETE CASCADE,
        UNIQUE(kBConceptId, fileId)
      );
      PRAGMA user_version = 1;
    `)
      }
      if (version !== 2) {
        connection.exec(`
        CREATE TABLE "ChatSetting" (
          id TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE "ChatDialogue" (
          chatId TEXT PRIMARY KEY NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE INDEX ChatDialogue_createdAt ON "ChatDialogue"(createdAt DESC, chatId);
        CREATE TABLE "ChatMessage" (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT,
          chatId TEXT NOT NULL REFERENCES "ChatDialogue"(chatId) ON DELETE CASCADE,
          id TEXT,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool_call', 'tool')),
          indexed INTEGER NOT NULL CHECK (indexed IN (0, 1)),
          payload TEXT NOT NULL CHECK (json_valid(payload))
        );
        CREATE INDEX ChatMessage_dialogue ON "ChatMessage"(chatId, sequence);
        CREATE INDEX ChatMessage_id ON "ChatMessage"(chatId, id);
        CREATE INDEX ChatMessage_indexed ON "ChatMessage"(indexed, sequence);
        PRAGMA user_version = 2;
      `)
      }
      connection.exec(`
        ALTER TABLE "ChatDialogue" ADD COLUMN channel TEXT NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat', 'feedback'));
        PRAGMA user_version = 3;
      `)
    })
    .immediate()
}
