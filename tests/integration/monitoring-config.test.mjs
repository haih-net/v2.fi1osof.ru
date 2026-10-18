import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'vitest'

test('two sites sharing one Traefik have separate probes, metric labels and missing-data alerts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'haih-config-'))
  try {
    await cp('docker/monitoring', directory, {
      recursive: true,
      filter: (source) => !source.includes('.secrets'),
    })
    const sites = [
      {
        site: 'first.example.test',
        traefik: 'http://traefik',
        routers: ['first@file'],
        checks: [
          { name: 'page', path: '/' },
          { name: 'api', path: '/api', graphql: true },
        ],
      },
    ]
    sites.push({
      ...sites[0],
      site: 'second.example.com',
      routers: ['second@file'],
      appMetrics: undefined,
    })
    await writeFile(join(directory, 'sites.json'), JSON.stringify(sites))
    execFileSync(process.execPath, [
      'scripts/configure-monitoring.mjs',
      directory,
    ])
    const probes = JSON.parse(
      await readFile(join(directory, 'prometheus/probes.json'), 'utf8'),
    )
    assert.equal(probes.length, 4)
    assert.equal(new Set(probes.map((p) => p.labels.site)).size, 2)
    const blackbox = JSON.parse(
      await readFile(join(directory, 'blackbox/config.yml'), 'utf8'),
    )
    assert.equal(
      blackbox.modules['second.example.com_api'].http.headers.Host,
      'second.example.com',
    )
    assert.equal(
      blackbox.modules['second.example.com_api'].http.follow_redirects,
      false,
    )
    const missing = JSON.parse(
      await readFile(join(directory, 'prometheus/expected-probes.yml'), 'utf8'),
    )
    assert.equal(missing.groups[0].rules.length, 4)
    const prometheus = JSON.parse(
      await readFile(join(directory, 'prometheus/prometheus.yml'), 'utf8'),
    )
    const rules = prometheus.scrape_configs.find(
      (x) => x.job_name === 'traefik',
    ).metric_relabel_configs
    assert.equal(rules.length, 2)
    assert.equal(rules[1].replacement, 'second.example.com')
    assert.ok(
      (await readFile(join(directory, 'alloy/config.alloy'), 'utf8')).includes(
        'second.example.com',
      ),
    )
    sites[1].routers = sites[0].routers
    await writeFile(join(directory, 'sites.json'), JSON.stringify(sites))
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          ['scripts/configure-monitoring.mjs', directory],
          { stdio: 'pipe' },
        ),
      /belongs to multiple sites/,
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
