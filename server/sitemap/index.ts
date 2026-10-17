import type { Express, Request, Response } from 'express'
import { db } from '../database'

interface SitemapItem {
  uri: string
  updatedAt?: Date | string
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character]
  })
}

function generateUrls(items: SitemapItem[], origin: string): string {
  const urls = new Map<string, SitemapItem>()
  for (const item of items) {
    const url = new URL(item.uri, `${origin}/`)
    if (url.origin !== origin) {
      continue
    }
    urls.set(url.href, item)
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(urls, ([url, item]) => {
  const lastmod = item.updatedAt
    ? `<lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>`
    : ''
  return `  <url><loc>${escapeXml(url)}</loc>${lastmod}<priority>0.9</priority></url>`
}).join('\n')}
</urlset>`
}

async function generateSitemap(req: Request, res: Response): Promise<void> {
  const origin = `${req.protocol}://${req.get('host')}`
  const concepts = await db('KBConcept')
    .select<SitemapItem[]>(
      db.raw(`COALESCE(NULLIF("uri", ''),
        (SELECT "path" FROM "SiteRoute" WHERE "kBConceptId" = "KBConcept"."id" LIMIT 1),
        '/concepts/' || "id") AS "uri"`),
      'updatedAt',
    )
    .whereNot('visibility', 'unpublished')
    .orderBy('updatedAt', 'desc')
  const xml = generateUrls([{ uri: '/' }, ...concepts], origin)
  res.set('Cache-Control', 'no-store').type('application/xml').send(xml)
}

export function setupSitemap(app: Express): void {
  app.get('/sitemap.xml', generateSitemap)
}
