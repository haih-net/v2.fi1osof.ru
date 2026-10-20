import type { Express, Request, Response } from 'express'
import { dbOld } from '../database_old'
import type { ConceptRecord } from '../schema/types/KBConcept/interfaces'
import type { ProjectRecord } from '../schema/types/Project/interfaces'
import type { TaskRecord } from '../schema/types/Task/interfaces'
import type { WorkLogRecord } from '../schema/types/TaskWorkLog/interfaces'

interface SitemapItem {
  uri: string
  updatedAt: Date | string
}

export enum SitemapSection {
  index = '/sitemap.xml',
  main = '/sitemap/main.xml',
  concepts = '/sitemap/concepts.xml',
  projects = '/sitemap/projects.xml',
  tasks = '/sitemap/tasks.xml',
  worklogs = '/sitemap/worklogs.xml',
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
  return `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${new Date(item.updatedAt).toISOString()}</lastmod>
    <priority>0.9</priority>
  </url>`
}).join('\n')}
</urlset>`
}

function generateSitemapIndex(origin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  SitemapSection.main,
  SitemapSection.concepts,
  SitemapSection.projects,
  SitemapSection.tasks,
  SitemapSection.worklogs,
]
  .map(
    (section) => `  <sitemap>
    <loc>${escapeXml(`${origin}${section}`)}</loc>
  </sitemap>`,
  )
  .join('\n')}
</sitemapindex>`
}

function getMainPages(): SitemapItem[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const updatedAt = monday.toISOString().split('T')[0]

  return ['/', '/concepts', '/projects', '/tasks', '/worklogs', '/about'].map(
    (uri) => ({ uri, updatedAt }),
  )
}

async function getConcepts(): Promise<SitemapItem[]> {
  const concepts = await dbOld<ConceptRecord>('KBConcept')
    .select('id', 'uri', 'updatedAt')
    .where('visibility', 'public')
    .whereNotNull('uri')
    .orderBy('updatedAt', 'desc')

  return concepts.flatMap((concept) =>
    concept.uri ? [{ uri: concept.uri, updatedAt: concept.updatedAt }] : [],
  )
}

async function getProjects(): Promise<SitemapItem[]> {
  const projects = await dbOld<ProjectRecord>('Project')
    .select('id', 'updatedAt')
    .orderBy('updatedAt', 'desc')

  return projects.map((project) => ({
    uri: `/projects/${project.id}`,
    updatedAt: project.updatedAt,
  }))
}

async function getTasks(): Promise<SitemapItem[]> {
  const tasks = await dbOld<TaskRecord>('Task')
    .select('id', 'updatedAt')
    .orderBy('updatedAt', 'desc')

  return tasks.map((task) => ({
    uri: `/tasks/${task.id}`,
    updatedAt: task.updatedAt,
  }))
}

async function getWorkLogs(): Promise<SitemapItem[]> {
  const worklogs = await dbOld<WorkLogRecord>('TaskWorkLog')
    .select('id', 'createdAt')
    .orderBy('createdAt', 'desc')

  return worklogs.map((worklog) => ({
    uri: `/worklogs/${worklog.id}`,
    updatedAt: worklog.createdAt,
  }))
}

async function generateSitemap(req: Request, res: Response): Promise<void> {
  const origin = `${req.protocol}://${req.get('host')}`
  let xml: string

  switch (req.path) {
    case SitemapSection.index:
      xml = generateSitemapIndex(origin)
      break
    case SitemapSection.main:
      xml = generateUrls(getMainPages(), origin)
      break
    case SitemapSection.concepts:
      xml = generateUrls(await getConcepts(), origin)
      break
    case SitemapSection.projects:
      xml = generateUrls(await getProjects(), origin)
      break
    case SitemapSection.tasks:
      xml = generateUrls(await getTasks(), origin)
      break
    case SitemapSection.worklogs:
      xml = generateUrls(await getWorkLogs(), origin)
      break
    default:
      res.status(404).send('Not found')
      return
  }

  res.set('Cache-Control', 'no-store').type('application/xml').send(xml)
}

export function setupSitemap(app: Express): void {
  app.get('/robots.txt', (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`
    res
      .type('text/plain')
      .send(
        `User-agent: *\nAllow: /\nDisallow: /api\nSitemap: ${origin}/sitemap.xml\n`,
      )
  })
  app.get([SitemapSection.index, '/sitemap/{*path}'], generateSitemap)
}
