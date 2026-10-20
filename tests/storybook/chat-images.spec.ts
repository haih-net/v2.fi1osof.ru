import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
]) {
  test(`Markdown images fit the viewport at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto(
      '/iframe.html?id=components-chatwidget--chat-window-with-messages&viewMode=story',
    )
    const window = page.getByTestId('chat-window')
    const header = page.getByTestId('chat-header')
    const content = page.getByTestId('chat-content')
    const footer = page.getByTestId('chat-footer')
    await expect(window).toBeVisible()
    if (viewport.width > 480) {
      await header.getByRole('button', { name: 'Изменить размер чата' }).click()
    }
    await expect
      .poll(async () => (await window.boundingBox())?.width)
      .toBe(viewport.width)
    await expect
      .poll(async () => (await header.boundingBox())?.width)
      .toBe(viewport.width)
    for (const region of [content, footer]) {
      await expect
        .poll(async () => (await region.boundingBox())?.width)
        .toBe(Math.min(1200, viewport.width))
      const bounds = await region.boundingBox()
      if (!bounds) {
        throw new Error('Expected a visible element with layout bounds')
      }
      expect(bounds.x).toBeCloseTo((viewport.width - bounds.width) / 2, 0)
    }
    const images = content.locator('img')
    await expect(images).toHaveCount(2)
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded()
      await expect
        .poll(() =>
          image.evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
        )
        .toBe(true)
      const bounds = await image.boundingBox()
      if (!bounds) {
        throw new Error('Expected a visible element with layout bounds')
      }
      expect(bounds.width).toBeGreaterThan(0)
      expect(bounds.width).toBeLessThanOrEqual(420)
      expect(bounds.height).toBeLessThanOrEqual(420)
      const natural = await image.evaluate((img: HTMLImageElement) => ({
        width: img.naturalWidth,
        height: img.naturalHeight,
      }))
      expect(Math.max(natural.width, natural.height)).toBeLessThanOrEqual(1200)
      expect(bounds.width / bounds.height).toBeCloseTo(
        natural.width / natural.height,
        2,
      )
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
    }
    const ratios = await images.evaluateAll((elements) =>
      elements.map((element) => {
        const img = element as HTMLImageElement
        return img.naturalWidth / img.naturalHeight
      }),
    )
    expect(ratios[0]).toBeCloseTo(1, 2)
    expect(ratios[1]).toBeGreaterThan(1.5)
    await expect(footer.getByRole('textbox')).toBeVisible()
    expect(
      await content.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true)
    expect(
      await footer.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true)
  })
}
