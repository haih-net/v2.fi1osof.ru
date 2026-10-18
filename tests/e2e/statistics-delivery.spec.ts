import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { PageViewEvent } from '../../app/components/Statistics/transport'

interface ActivityInput {
  type: string
  status: string
  data: PageViewEvent
}

const listen = async (server: Server): Promise<number> => {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected a local TCP address')
  }
  return address.port
}

const close = (server: Server): Promise<void> =>
  new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )

test('forwards browser 404 and recovery through the real API with correct Activity status', async ({
  page,
}) => {
  const activities: ActivityInput[] = []
  const receiver: Server = createServer(async (req, res) => {
    if (req.headers.authorization !== 'Bearer fixture-token') {
      res.writeHead(401).end()
      return
    }
    let body: string = ''
    for await (const chunk of req) {
      body += String(chunk)
    }
    const packet = JSON.parse(body) as { variables: { input: ActivityInput } }
    activities.push(packet.variables.input)
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        data: { createActivity: { id: `activity-${activities.length}` } },
      }),
    )
  })
  const receiverPort: number = await listen(receiver)
  let appProcess: ChildProcess | undefined
  try {
    const reservation: Server = createServer()
    const appPort: number = await listen(reservation)
    await close(reservation)
    const origin: string = `http://127.0.0.1:${appPort}`
    appProcess = spawn(process.execPath, [resolve('build/node/index.js')], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        DATABASE_FILENAME: ':memory:',
        PORT: String(appPort),
        METRICS_PORT: '',
        AGENTS_CENTER_ENDPOINT: `http://127.0.0.1:${receiverPort}/api/`,
        AGENTS_CENTER_TOKEN: 'fixture-token',
      },
      stdio: 'ignore',
    })
    await expect
      .poll(
        async () => {
          if (appProcess?.exitCode !== null) {
            throw new Error('Fixture app exited')
          }
          try {
            return (await fetch(origin)).status
          } catch {
            return 0
          }
        },
        { timeout: 10000 },
      )
      .toBe(200)

    const acknowledgements: string[] = []
    page.on('response', async (response) => {
      if (response.url() !== `${origin}/api/`) {
        return
      }
      const body = (await response.json()) as {
        data?: { logStats?: { id: string }[] }
      }
      const id: string | undefined = body.data?.logStats?.[0]?.id
      if (id) {
        acknowledgements.push(id)
      }
    })
    const response = await page.goto(`${origin}/.env.33333`)
    expect(response?.status()).toBe(404)
    await expect.poll(() => acknowledgements.length).toBe(1)
    expect(activities[0]).toMatchObject({
      type: 'page.viewed',
      status: 'failed',
      data: { statusCode: 404, status: 'failed', url: `${origin}/.env.33333` },
    })
    await page.locator('header a[href="/"]').click()
    await expect.poll(() => acknowledgements.length).toBe(2)
    expect(activities[1]).toMatchObject({
      status: 'success',
      data: { statusCode: 200, status: 'success' },
    })
    expect(acknowledgements).toEqual(['activity-1', 'activity-2'])
    await page.waitForTimeout(200)
    expect(activities).toHaveLength(2)
  } finally {
    await page.close()
    receiver.closeAllConnections()
    if (appProcess && appProcess.exitCode === null) {
      const exited: Promise<unknown> = once(appProcess, 'exit')
      appProcess.kill('SIGKILL')
      await exited
    }
    await close(receiver)
  }
})
