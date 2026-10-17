// @ts-check

/** @type {import("vitest/config").UserConfig} */
const testConfig = {
  test: {
    environment: 'node',
    env: { DATABASE_FILENAME: ':memory:' },
    include: [
      'tests/unit/**/*.test.{ts,tsx,mjs}',
      'app/**/*.test.{ts,tsx}',
      'server/**/*.test.ts',
    ],
    testTimeout: 5000,
    hookTimeout: 5000,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['app/components/seo/**/*.ts', 'server/**/*.ts'],
      exclude: ['**/types.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
}

/** @type {import("vite").UserConfigFnPromise} */
module.exports = async (configEnv) => {
  const { resolve } = await import('node:path')
  const { loadConfigFromFile, mergeConfig } = await import('vite')
  const loaded = await loadConfigFromFile(
    configEnv,
    resolve(__dirname, 'vite.config.ts'),
  )
  if (!loaded) {
    throw new Error('Unable to load the Vite configuration for tests')
  }
  return mergeConfig(loaded.config, testConfig)
}
