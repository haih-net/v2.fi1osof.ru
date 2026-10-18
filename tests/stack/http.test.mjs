import { test } from 'vitest'
import assert from 'node:assert/strict'

// Run against the production Traefik -> Varnish -> Node.js path.
const base = process.env.TEST_URL || 'http://localhost'
const run = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const url = (path) => `${base}${path}?http-test=${run}`

const assertTtl = (response, maximum) => {
  const header = response.headers.get('x-cache-ttl')
  assert.notEqual(header, null, 'Expected a Varnish X-Cache-TTL header')
  const ttl = Number(header)
  assert.ok(
    Number.isFinite(ttl) && ttl > 0 && ttl <= maximum,
    `Unexpected TTL: ${header}`,
  )
}

test('public routes expose server-rendered content and metadata', async () => {
  for (const path of ['/']) {
    const response = await fetch(url(path))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /text\/html/)
    const html = await response.text()
    assert.match(html, /<title>[\s\S]*?<\/title>/)
  }
})

test('unknown documents and missing assets return uncached 404 responses', async () => {
  for (const path of ['/missing-page', '/assets/missing.js']) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url(path), {
        headers: { Accept: 'text/html' },
      })
      assert.equal(response.status, 404, path)
      assert.equal(response.headers.get('x-cache'), 'MISS', path)
      if (path === '/missing-page') {
        assert.match(response.headers.get('content-type'), /text\/html/)
        assert.match(await response.text(), /noindex/)
      } else {
        await response.arrayBuffer()
      }
    }
  }
})

test('page methods preserve HEAD and reject unsupported POST', async () => {
  const post = await fetch(url('/'), { method: 'POST' })
  assert.equal(post.status, 405)
  const head = await fetch(url('/'), { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
})

test('Varnish caches public HTML for up to one hour and assets for up to seven days', async () => {
  const html = await (await fetch(url('/'))).text()
  const asset = html.match(/\/assets\/[^"\s]+\.js/)
  assert.ok(asset, 'Expected a built JavaScript asset in the page HTML')
  for (const [path, ttl] of [
    ['/', 3600],
    [asset[0], 7 * 24 * 3600],
  ]) {
    const first = await fetch(url(path))
    assert.equal(first.status, 200)
    await first.arrayBuffer()
    const cached = await fetch(url(path))
    assert.equal(cached.status, 200)
    assert.equal(cached.headers.get('x-cache'), 'HIT', path)
    assertTtl(cached, ttl)
    await cached.arrayBuffer()
  }
})

test('GraphQL is available through the production entry point', async () => {
  const response = await fetch(`${base}/api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ health }' }),
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { data: { health: 'ok' } })
  assert.equal(response.headers.get('x-cache'), 'MISS')
})
