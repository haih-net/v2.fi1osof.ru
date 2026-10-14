import { beforeAll, afterAll, test, assert } from 'vitest'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout } from 'node:timers'

let server
let origin
let output = ''
beforeAll(async () => {
  const reservation = createServer().listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const port = reservation.address().port
  await new Promise((resolve) => reservation.close(resolve))
  origin = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, ['build/node/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      METRICS_PORT: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', (data) => {
    output += data
  })
  server.stderr.on('data', (data) => {
    output += data
  })
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output)
    try {
      if ((await fetch(`${origin}/robots.txt`)).ok) return
    } catch {
      /* Wait for the test server to listen. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Server did not start: ${output}`)
}, 15000)
afterAll(async () => {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit')
    server.kill('SIGKILL')
    await exited
  }
})
const headOf = (html) => html.match(/<head>([\s\S]*?)<\/head>/)[1]

for (const path of [
  '/',
  '/concepts',
  '/projects',
  '/tasks',
  '/worklogs',
  '/timers',
  '/about',
  '/users',
]) {
  test(`${path} serves database content and metadata in SSR HTML`, async () => {
    const response = await fetch(origin + path)
    assert.equal(response.status, 200)
    const html = await response.text()
    const head = headOf(html)
    assert.equal((head.match(/<title>/g) || []).length, 1)
    assert.equal((head.match(/rel="canonical"/g) || []).length, 1)
    assert.ok(head.includes(`rel="canonical" href="https://fi1osof.ru${path}"`))
    assert.ok(head.includes('name="description"'))
    assert.ok(head.includes('property="og:description"'))
    assert.ok(head.includes('application/ld+json'))
    assert.equal((head.match(/rel="alternate"/g) || []).length, 0)
    assert.ok(!head.includes('haih.site'))
    assert.match(html, /<h1/)
    assert.match(response.headers.get('cache-control'), /no-store/)
  })
}
test('database sitemaps contain resolvable detail pages', async () => {
  const index = await (await fetch(origin + '/sitemap.xml')).text()
  assert.equal((index.match(/<sitemap>/g) || []).length, 5)
  for (const section of [
    'concepts',
    'projects',
    'tasks',
    'worklogs',
    'users',
  ]) {
    const xml = await (await fetch(`${origin}/sitemap/${section}.xml`)).text()
    const url = xml.match(/<loc>(.*?)<\/loc>/)[1]
    const response = await fetch(origin + new URL(url).pathname)
    assert.equal(response.status, 200, url)
    assert.match(await response.text(), /<h1/)
  }
})
test('localized journal redirects remove locale and preserve query', async () => {
  const response = await fetch(origin + '/en/work-logs/example?page=2', {
    redirect: 'manual',
  })
  assert.equal(response.status, 301)
  assert.equal(response.headers.get('location'), '/work-logs/example?page=2')
})
test('unknown records and assets return 404 without canonical', async () => {
  for (const path of [
    '/missing-seo-page',
    '/tasks/missing',
    '/assets/missing.js',
  ]) {
    const response = await fetch(origin + path)
    assert.equal(response.status, 404)
    const head = headOf(await response.text())
    assert.ok(head.includes('noindex'))
    assert.ok(!head.includes('rel="canonical"'))
  }
})
