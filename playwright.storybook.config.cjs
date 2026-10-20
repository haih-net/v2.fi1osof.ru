// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests/storybook',
  use: {
    baseURL: 'http://localhost:6007',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run storybook -- --port 6007 --ci',
    url: 'http://localhost:6007',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
}
