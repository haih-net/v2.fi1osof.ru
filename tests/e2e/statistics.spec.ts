import { expect, test } from '@playwright/test'
import type { StatisticsPacket } from '../../app/components/Statistics/transport'

test('collects initial and SPA page visits without chat or duplicate hash events', async ({
  page,
}) => {
  const packets: StatisticsPacket[] = []
  await page.route('**/api/', async (route) => {
    if (!route.request().postDataJSON().query?.includes('mutation LogStats(')) {
      await route.continue()
      return
    }
    const body = route.request().postDataJSON() as {
      variables: { data: StatisticsPacket }
    }
    packets.push(body.variables.data)
    expect(route.request().headers().authorization).toBeUndefined()
    await route.fulfill({ json: { data: { logStats: [{ id: 'saved' }] } } })
  })
  await page.goto('/signin')
  await expect.poll(() => packets.length).toBe(1)
  await page.locator('header a[href="/"]').click()
  await expect.poll(() => packets.length).toBe(2)
  const destinationTitle = await page.title()
  await page.goBack()
  await expect.poll(() => packets.length).toBe(3)
  expect(
    packets.map((packet) => new URL(packet.events[0].url).pathname),
  ).toEqual(['/signin', '/', '/signin'])
  expect(packets[1].events[0].referrer).toBe(packets[0].events[0].url)
  expect(packets[1].events[0].title).toBe(destinationTitle)
  expect(new Set(packets.map((packet) => packet.visitorId)).size).toBe(1)
  expect(new Set(packets.map((packet) => packet.events[0].eventKey)).size).toBe(
    3,
  )
  await page.evaluate(() => {
    location.hash = 'main-content'
  })
  await page.waitForTimeout(200)
  expect(packets).toHaveLength(3)
  const visitorId: string = packets[0].visitorId
  await page.reload()
  await expect.poll(() => packets.length).toBe(4)
  expect(packets[3].visitorId).toBe(visitorId)
})

test('stops after three failed attempts and keeps navigation usable', async ({
  page,
}) => {
  const keys: string[] = []
  await page.route('**/api/', async (route) => {
    if (!route.request().postDataJSON().query?.includes('mutation LogStats(')) {
      await route.continue()
      return
    }
    const body = route.request().postDataJSON() as {
      variables: { data: StatisticsPacket }
    }
    keys.push(body.variables.data.events[0].eventKey)
    await route.fulfill({ status: 503, body: 'Unavailable' })
  })
  await page.goto('/signin')
  await expect.poll(() => keys.length, { timeout: 7000 }).toBe(3)
  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) {
      window.dispatchEvent(new Event('pagehide'))
    }
  })
  await page.waitForTimeout(3500)
  expect(keys).toHaveLength(3)
  expect(new Set(keys).size).toBe(1)
  await page.locator('header a[href="/"]').click()
  await expect(page).toHaveURL(/\/$/)
})

test('blocked storage does not break collection; disabled integration does not retry on navigation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, key, {
        get: () => {
          throw new Error('blocked')
        },
      })
    }
  })
  let requests: number = 0
  await page.route('**/api/', async (route) => {
    if (!route.request().postDataJSON().query?.includes('mutation LogStats(')) {
      await route.continue()
      return
    }
    requests += 1
    await route.fulfill({ json: { data: { logStats: null } } })
  })
  await page.goto('/signin')
  await expect.poll(() => requests).toBe(1)
  await page.locator('header a[href="/"]').click()
  await expect(page).toHaveURL(/\/$/)
  await page.waitForTimeout(200)
  expect(requests).toBe(1)
})
