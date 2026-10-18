import { expect, test } from '@playwright/test'
import type { StatisticsPacket } from '../../app/components/Statistics/transport'

const domains: ReadonlyArray<readonly [string, string]> = [
  ['xn--80aaafca4ocd5a.localhost', 'ываыаввыаю.localhost'],
  ['xn--e1afmkfd.test', 'пример.test'],
]

for (const [ascii, unicode] of domains) {
  test(`browser sends Unicode statistics from ${ascii}`, async ({
    page,
    baseURL,
  }) => {
    const origin: string = `http://${ascii}:3100`
    const decodedOrigin: string = `http://${unicode}:3100`
    const packets: StatisticsPacket[] = []
    // Serve the real build on an IDN origin without relying on external DNS.
    await page.route(`${origin}/**`, async (route) => {
      const url: URL = new URL(route.request().url())
      if (
        url.pathname === '/api/' &&
        route.request().postDataJSON().query?.includes('mutation LogStats(')
      ) {
        const body = route.request().postDataJSON() as {
          variables: { data: StatisticsPacket }
        }
        packets.push(body.variables.data)
        await route.fulfill({ json: { data: { logStats: [{ id: 'saved' }] } } })
        return
      }
      const response = await route.fetch({
        url: new URL(`${url.pathname}${url.search}`, baseURL).href,
      })
      await route.fulfill({ response })
    })
    await page.goto(`${origin}/signin?next=xn--p1ai`, {
      referer: 'http://www.xn--e1afmkfd.xn--p1ai/',
    })
    await expect.poll(() => packets.length).toBe(1)
    expect(packets[0].events[0].url).toBe(
      `${decodedOrigin}/signin?next=xn--p1ai`,
    )
    expect(packets[0].events[0].referrer).toBe('http://www.пример.рф/')
    const link = page.locator('header a[href="/"]').first()
    const destination: string | null = await link.getAttribute('href')
    await link.click()
    await expect.poll(() => packets.length).toBe(2)
    expect(packets[1].events[0].url).toBe(`${decodedOrigin}${destination}`)
    expect(packets[1].events[0].referrer).toBe(packets[0].events[0].url)
    await page.goBack()
    await expect.poll(() => packets.length).toBe(3)
    expect(packets[2].events[0].url).toBe(packets[0].events[0].url)
    expect(packets[2].events[0].referrer).toBe(packets[1].events[0].url)
  })
}
