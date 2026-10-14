import { test, expect } from '@playwright/test'

test('hydration, SPA navigation, metadata, focus and browser history', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeFocused()
  // This property disappears on a document reload, including an accidental anchor navigation.
  await page.evaluate(() => Reflect.set(window, '__spaTest', 'same-document'))
  await page
    .locator('footer nav')
    .getByRole('link', { name: 'Проекты' })
    .click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page).toHaveTitle('Проекты')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://fi1osof.ru/projects',
  )
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeFocused()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('main h1').first()).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/projects$/)
  expect(await page.evaluate(() => Reflect.get(window, '__spaTest'))).toBe(
    'same-document',
  )
  expect(errors).toEqual([])
})

test('public deep links survive refresh', async ({ page }) => {
  const response = await page.goto('/en/projects')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  const title: string = await page.title()
  const refreshed = await page.reload()
  expect(refreshed?.status()).toBe(200)
  await expect(page).toHaveTitle(title)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://fi1osof.ru/en/projects',
  )
})

test('unknown pages and missing assets return 404', async ({
  page,
  request,
}) => {
  const response = await page.goto('/missing-e2e-page')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: /404/ })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  const asset = await request.get('/assets/missing-e2e.js')
  expect(asset.status()).toBe(404)
})
