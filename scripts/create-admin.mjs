#!/usr/bin/env node
// @ts-check
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { initializeSchema } from '../server/database/schema.ts'

async function main() {
  const { values } = parseArgs({
    options: {
      username: { type: 'string' },
      email: { type: 'string' },
      database: { type: 'string' },
      'password-stdin': { type: 'boolean' },
      'allow-existing-users': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (values.help) {
    console.log(`Usage: node scripts/create-admin.mjs --username <username> [--email <email>] [--password-stdin] [--database <path>]

Provide the password via ADMIN_PASSWORD or --password-stdin.
Creates an active administrator only when the User table is empty.
Default database: server/database/data/database.sqlite in this project.
Use --allow-existing-users to explicitly create an additional administrator. Existing accounts are never updated.`)
    return
  }
  const username = values.username?.trim()
  if (!username) throw new Error('--username is required')
  const email = values.email?.trim() || null
  let password = process.env.ADMIN_PASSWORD
  if (values['password-stdin']) {
    process.stdin.setEncoding('utf8')
    password = ''
    for await (const chunk of process.stdin) password += chunk
    password = password.replace(/\r?\n$/, '')
  }
  // eslint-disable-next-line no-undef
  if (!password || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error(
      'Provide a password of 1–72 UTF-8 bytes via ADMIN_PASSWORD or --password-stdin',
    )
  }
  const hash = await bcrypt.hash(password, 10)
  const filename = values.database
    ? resolve(values.database)
    : fileURLToPath(
        new URL('../server/database/data/database.sqlite', import.meta.url),
      )
  mkdirSync(dirname(filename), { recursive: true })
  const database = new Database(filename)
  try {
    database.pragma('busy_timeout = 5000')
    database.pragma('journal_mode = WAL')
    database.pragma('foreign_keys = ON')
    initializeSchema(database)
    database
      .transaction(() => {
        if (
          !values['allow-existing-users'] &&
          database.prepare('SELECT 1 FROM "User" LIMIT 1').get()
        ) {
          throw new Error(
            'Cannot create administrator: the database already contains users',
          )
        }
        database
          .prepare(
            `
        INSERT INTO "User" (id, username, email, password, status, sudo, isAiAgent)
        VALUES (?, ?, ?, ?, 'active', 1, 0)
      `,
          )
          .run(randomUUID(), username, email, hash)
      })
      .immediate()
    console.log(`Administrator "${username}" created`)
  } finally {
    database.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
