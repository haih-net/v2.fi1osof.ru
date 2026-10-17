import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { afterEach, beforeEach, expect, it } from 'vitest'

const execute = promisify(execFile)
const script = resolve('scripts/create-admin.mjs')
const password = 'isolated-admin-test-password'
let directory
let filename

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'create-admin-'))
  filename = join(directory, 'database.sqlite')
})
afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

function run(username = 'admin', secret = password) {
  return execute(
    process.execPath,
    [script, '--database', filename, '--username', username],
    {
      env: { ...process.env, ADMIN_PASSWORD: secret },
    },
  )
}

it('initializes SQLite and creates an active administrator with a usable password hash', async () => {
  const result = await run()
  expect(result.stdout).toContain('Administrator "admin" created')
  expect(result.stdout + result.stderr).not.toContain(password)
  const db = new Database(filename)
  try {
    const users = db.prepare('SELECT * FROM "User"').all()
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({
      username: 'admin',
      status: 'active',
      sudo: 1,
      isAiAgent: 0,
    })
    expect(await bcrypt.compare(password, users[0].password)).toBe(true)
  } finally {
    db.close()
  }
})

it('refuses when any user exists, including a non-admin blocked user', async () => {
  await run()
  const db = new Database(filename)
  try {
    db.prepare('UPDATE "User" SET sudo = 0, status = ?').run('blocked')
    const before = db.prepare('SELECT * FROM "User"').all()
    await expect(run('another')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('already contains users'),
    })
    expect(db.prepare('SELECT * FROM "User"').all()).toEqual(before)
  } finally {
    db.close()
  }
})

it('creates only one administrator when two CLI processes race', async () => {
  const results = await Promise.allSettled([run('first'), run('second')])
  expect(
    results.filter((result) => result.status === 'fulfilled'),
  ).toHaveLength(1)
  const failure = results.find((result) => result.status === 'rejected')
  expect(failure.reason.stderr).toContain('already contains users')
  const db = new Database(filename)
  try {
    expect(db.prepare('SELECT * FROM "User"').all()).toHaveLength(1)
  } finally {
    db.close()
  }
})

it('rejects missing or oversized passwords', async () => {
  await expect(run('admin', '')).rejects.toMatchObject({ code: 1 })
  await expect(run('admin', 'я'.repeat(37))).rejects.toMatchObject({ code: 1 })
})
