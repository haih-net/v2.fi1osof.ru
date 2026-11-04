import { createRequire } from 'node:module'
import type { Request } from 'express'
import type { Knex } from 'knex'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createDatabase } from '../../../database'
import { schema } from '../../index'
import type { UserRecord } from '../User/interfaces'
import type { PageViewEvent } from '../../../../app/components/Statistics/transport'
import { logStatistics } from '../../../statistics'
import { recordPageError } from './storage'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')
let db: Knex
const event: PageViewEvent = {
  eventId: 'page.viewed',
  eventKey: 'a'.repeat(24),
  timestamp: 1000,
  url: 'https://site.test/broken',
  status: 'failed',
  statusCode: 404,
  referrer: '',
  title: '',
  language: 'en',
  viewport: { width: 390, height: 844 },
}
beforeEach(() => {
  vi.stubEnv('DATABASE_FILENAME', ':memory:')
  db = createDatabase()
})
afterEach(async () => {
  await db.destroy()
  vi.unstubAllEnvs()
})
async function execute(source: string, admin = true) {
  const currentUser = admin
    ? await db<UserRecord>('User').where({ id: 'admin' }).first()
    : null
  return graphql({
    schema,
    source,
    contextValue: { db, currentUser, req: {} as Request },
  })
}
async function createAdmin(): Promise<void> {
  await db('User').insert({ id: 'admin', sudo: 1 })
}
it('records errors without the external integration and deduplicates delivery retries', async () => {
  vi.stubEnv('AGENTS_CENTER_ENDPOINT', '')
  vi.stubEnv('AGENTS_CENTER_TOKEN', '')
  const packet = {
    visitorId: 'b'.repeat(24),
    tabId: 'c'.repeat(24),
    events: [event],
  }
  await logStatistics(packet, {} as Request, db)
  await logStatistics(packet, {} as Request, db)
  expect(await db('PageError').first()).toMatchObject({
    count: 1,
    status: null,
    lastOccurredAt: 1000,
  })
  await recordPageError(db, {
    ...event,
    eventKey: 'd'.repeat(24),
    timestamp: 2000,
  })
  expect(await db('PageError').first()).toMatchObject({
    count: 2,
    lastOccurredAt: 2000,
  })
  await recordPageError(db, {
    ...event,
    url: 'https://site.test/ok',
    status: 'success',
    statusCode: 200,
  })
  expect(await db('PageError')).toHaveLength(1)
})
it('requires review, rejects stale updates, reopens errors and clears only resolved records', async () => {
  await createAdmin()
  await recordPageError(db, event)
  const update = (status: string, count = 1) =>
    execute(
      `mutation { updatePageError(url: "${event.url}", count: ${count}, status: ${status}) { status } }`,
    )
  expect((await update('Resolved')).errors).toBeDefined()
  expect((await update('Review')).errors).toBeUndefined()
  await recordPageError(db, {
    ...event,
    eventKey: 'b'.repeat(24),
    timestamp: 2000,
  })
  expect((await update('Resolved')).errors).toBeDefined()
  expect((await update('Review', 2)).errors).toBeUndefined()
  expect((await update('Resolved', 2)).errors).toBeUndefined()
  expect((await execute('{ pageErrors { url } }')).data?.pageErrors).toEqual([])
  await recordPageError(db, {
    ...event,
    eventKey: 'c'.repeat(24),
    timestamp: 3000,
  })
  expect(await db('PageError').first()).toMatchObject({
    status: null,
    count: 3,
  })
  await update('Review', 3)
  await update('Resolved', 3)
  await recordPageError(db, {
    ...event,
    url: 'https://site.test/other',
    eventKey: 'd'.repeat(24),
  })
  expect(
    (await execute('mutation { clearResolvedPageErrors }')).data
      ?.clearResolvedPageErrors,
  ).toBe(1)
  expect(await db('PageError')).toHaveLength(1)
  expect(await db('PageErrorEvent')).toHaveLength(1)
})
it('restricts all operations to administrators and supports both sort orders', async () => {
  await createAdmin()
  await recordPageError(db, event)
  await recordPageError(db, {
    ...event,
    url: 'https://site.test/aaa',
    eventKey: 'b'.repeat(24),
    timestamp: 500,
  })
  expect((await execute('{ pageErrors { url } }')).data?.pageErrors).toEqual([
    { url: 'https://site.test/aaa' },
    { url: event.url },
  ])
  expect(
    (await execute('{ pageErrors(sort: LastOccurredAt) { url } }')).data
      ?.pageErrors,
  ).toEqual([{ url: event.url }, { url: 'https://site.test/aaa' }])
  for (const source of [
    '{ pageErrors { url } }',
    'mutation { clearResolvedPageErrors }',
    `mutation { updatePageError(url: "${event.url}", count: 1, status: Review) { status } }`,
  ]) {
    expect((await execute(source, false)).errors).toBeDefined()
  }
})
