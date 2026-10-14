import type { Express } from 'express'
import { db } from '../../../../server/database'

const origin = 'https://fi1osof.ru'
const namespaces = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
export function setupSiteMetadata(app: Express): void {
  app.get('/robots.txt', (_req, res) => {
    res
      .type('text/plain')
      .send(
        `User-agent: *\nAllow: /\nDisallow: /api\nSitemap: ${origin}/sitemap.xml\n`,
      )
  })
  app.get('/sitemap.xml', (_req, res) => {
    const maps = ['main', 'concepts', 'projects', 'tasks', 'worklogs']
    res
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><sitemapindex ${namespaces}>${maps.map((name) => `<sitemap><loc>${origin}/sitemap/${name}.xml</loc></sitemap>`).join('')}</sitemapindex>`,
      )
  })
  app.get('/sitemap/:name.xml', async (req, res, next) => {
    try {
      const name = String(req.params.name)
      let paths: string[]
      if (name === 'main') {
        paths = ['/', '/concepts', '/projects', '/tasks', '/worklogs', '/about']
      } else if (name === 'concepts') {
        const rows = await db('KBConcept as c')
          .leftJoin('SiteRoute as r', 'r.kBConceptId', 'c.id')
          .where('c.visibility', 'public')
          .select<{ id: string; uri: string | null; path: string | null }[]>(
            'c.id',
            'c.uri',
            'r.path',
          )
        paths = rows.map((row) => row.uri || row.path || `/concepts/${row.id}`)
      } else {
        const tables: Record<string, string> = {
          projects: 'Project',
          tasks: 'Task',
          worklogs: 'TaskWorkLog',
          users: 'User',
        }
        const table = tables[name]
        if (!table) {
          res.sendStatus(404)
          return
        }
        const rows = await db<{ id: string }>(table).select('id')
        paths = rows.map((row) => `/${name}/${row.id}`)
      }
      const urls = paths.flatMap((path) =>
        ['', '/en', '/vi'].map(
          (prefix) =>
            `<url><loc>${escapeXml(origin + prefix + path)}</loc></url>`,
        ),
      )
      res
        .type('application/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?><urlset ${namespaces}>${urls.join('')}</urlset>`,
        )
    } catch (error) {
      next(error)
    }
  })
}
