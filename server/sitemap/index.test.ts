import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { site } from '../../app/components/seo/site'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const { query, database } = vi.hoisted(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereNotNull: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
  }
  const database = Object.assign(
    vi.fn(() => query),
    { raw: vi.fn() },
  )
  return { query, database }
})
vi.mock('../database_old', () => ({ dbOld: database }))
import { setupSitemap } from './index'

let server: Server
let origin: string
beforeAll(async () => {
  const app = express()
  app.set('trust proxy', true)
  setupSitemap(app)
  server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

beforeEach(() => {
  vi.clearAllMocks()
  query.orderBy.mockReset().mockResolvedValue([])
})

describe('Динамическая карта сайта', () => {
  it('выдаёт индекс разделов с каноническим доменом за HTTPS прокси', async () => {
    const response = await fetch(`${origin}/sitemap.xml?check=1`, {
      headers: { 'X-Forwarded-Proto': 'https' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/xml')
    const xml = await response.text()
    for (const section of [
      'main',
      'concepts',
      'projects',
      'tasks',
      'worklogs',
    ]) {
      expect(xml).toContain(`<loc>${site.origin}/sitemap/${section}.xml</loc>`)
    }
    expect(xml.match(/<sitemap>/g)).toHaveLength(5)
    expect(xml).toContain('<sitemapindex')
    expect(xml).not.toContain('<urlset')
    expect(database).not.toHaveBeenCalled()
  })

  it('включает статические страницы, если записей нет', async () => {
    const xml = await (await fetch(`${origin}/sitemap/main.xml`)).text()
    expect(xml).toContain(`<loc>${site.origin}/</loc>`)
    expect(xml.match(/<url>/g)).toHaveLength(6)
    expect(xml).not.toContain('<lastmod>')
    expect(xml).not.toContain('/signin')
  })

  it('читает базу заново, фильтрует публикации и экранирует XML', async () => {
    query.orderBy.mockResolvedValueOnce([
      { uri: '/city/test?a=1&b=2', updatedAt: '2026-10-01T00:00:00Z' },
      { uri: '/city/test?a=1&b=2', updatedAt: '2026-10-01T00:00:00Z' },
      { uri: 'https://other.example/test' },
    ])
    const response = await fetch(`${origin}/sitemap/concepts.xml`)
    const xml = await response.text()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(database).toHaveBeenCalledWith('KBConcept')
    expect(query.where).toHaveBeenCalledWith('visibility', 'public')
    expect(query.whereNotNull).toHaveBeenCalledWith('uri')
    expect(xml).toContain('/city/test?a=1&amp;b=2</loc>')
    expect(xml).toContain('<lastmod>2026-10-01T00:00:00.000Z</lastmod>')
    expect(xml.match(/<url>/g)).toHaveLength(1)
    expect(xml).not.toContain('other.example')
    query.orderBy.mockResolvedValueOnce([{ uri: '/new-page' }])
    const nextXml = await (await fetch(`${origin}/sitemap/concepts.xml`)).text()
    expect(nextXml).toContain('/new-page</loc>')
    expect(nextXml).not.toContain('/city/test')
  })
})
