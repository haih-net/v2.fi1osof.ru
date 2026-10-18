import { Buffer } from 'node:buffer'
import { setTimeout } from 'node:timers'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'vitest'

const base = process.env.MONITORING_TEST_URL ?? 'http://127.0.0.1:18080'
const sites = JSON.parse(
  await readFile(
    new URL('../../docker/monitoring/sites.json', import.meta.url),
    'utf8',
  ),
)
const monitoredSite =
  sites.find((entry) => entry.site === process.env.MONITORING_TEST_SITE) ??
  sites[0]
const siteLabel = JSON.stringify(monitoredSite.site)
const grafana = process.env.GRAFANA_TEST_URL ?? 'http://127.0.0.1:13000'
const password = (
  await readFile(
    new URL(
      '../../docker/monitoring/.secrets/grafana_admin_password',
      import.meta.url,
    ),
    'utf8',
  )
).trim()
const authorization = `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
const api = async (path) => {
  const r = await fetch(grafana + path, { headers: { authorization } })
  assert.equal(r.status, 200, await r.clone().text())
  return r.json()
}
const query = async (expression) =>
  (
    await api(
      '/api/datasources/proxy/uid/prometheus/api/v1/query?query=' +
        encodeURIComponent(expression),
    )
  ).data.result
const eventually = async (check) => {
  const deadline = Date.now() + 65_000
  while (true) {
    try {
      return await check()
    } catch (error) {
      if (Date.now() > deadline) throw error
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

test('sources, site probes, requests, logs and provisioned dashboard work', async () => {
  const dashboard = await api('/api/dashboards/uid/haih-overview')
  assert.ok(dashboard.dashboard.panels.length >= 15)
  for (const type of ['prometheus', 'loki']) {
    const data = await api('/api/datasources/uid/' + type + '/health')
    assert.equal(data.status, 'OK', JSON.stringify(data))
  }
  assert.ok(
    (await api('/api/datasources/proxy/uid/alertmanager/api/v2/status'))
      .versionInfo,
  )
  for (let i = 0; i < 25; i++) {
    const r = await fetch(base + '/', {
      headers: { Host: monitoredSite.site },
    })
    assert.equal(r.status, 200)
    await r.text()
  }
  const marker = 'monitoring-check-' + Date.now()
  const missing = await fetch(
    base + '/' + marker + '?token=DO_NOT_STORE_QUERY',
    {
      headers: {
        Host: monitoredSite.site,
        Authorization: 'Bearer DO_NOT_STORE_HEADER',
      },
    },
  )
  assert.equal(missing.status, 404)
  await missing.text()
  const invalid = await fetch(base + '/api', {
    method: 'POST',
    headers: { Host: monitoredSite.site, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ nonExistentField }' }),
  })
  assert.ok((await invalid.json()).errors.length)
  await eventually(async () => {
    const targets = await query('up')
    assert.ok(targets.length >= 9)
    assert.ok(
      targets.every((v) => v.value[1] === '1'),
      JSON.stringify(targets),
    )
    const probes = await query(`probe_success{site=${siteLabel}}`)
    assert.equal(probes.length, monitoredSite.checks.length)
    assert.ok(probes.every((v) => v.value[1] === '1'))
    const requests = await query(
      `sum(traefik_router_requests_total{site=${siteLabel}})`,
    )
    assert.ok(Number(requests[0].value[1]) >= 25)
    const errors = await query(
      `haih_graphql_errors_total{kind="client",site=${siteLabel}}`,
    )
    assert.ok(Number(errors[0].value[1]) >= 1)
    const bytes = await query(
      `sum(traefik_router_responses_bytes_total{site=${siteLabel}})`,
    )
    assert.ok(Number(bytes[0].value[1]) > 0)
    const logQuery = '{service="traefik"} |= "' + marker + '"'
    const logs = await api(
      '/api/datasources/proxy/uid/loki/loki/api/v1/query_range?query=' +
        encodeURIComponent(logQuery) +
        '&since=10m',
    )
    const text = JSON.stringify(logs.data.result)
    assert.ok(text.includes(marker), 'Request log not ingested yet')
    assert.ok(!text.includes('DO_NOT_STORE_QUERY'))
    assert.ok(!text.includes('DO_NOT_STORE_HEADER'))
  })
  const metrics = await fetch(base + '/metrics', {
    headers: { Host: monitoredSite.site },
  })
  assert.equal(
    metrics.status,
    404,
    'Private metrics must not be exposed through the site',
  )
})
