// @ts-check
// CommonJS configuration keeps the repository's named-export convention.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { devices } = require('@playwright/test')
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4317'

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm start',
        url: baseURL,
        env: { PORT: '4317', METRICS_PORT: '', DATABASE_FILENAME: ':memory:' },
        reuseExistingServer: false,
        timeout: 120000,
      },
}
