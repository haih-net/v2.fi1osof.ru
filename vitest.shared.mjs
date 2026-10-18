// @ts-check
import { fileURLToPath } from 'node:url'
import { loadConfigFromFile, mergeConfig } from 'vite'

/**
 * @param {import('vite').ConfigEnv} configEnv
 * @param {NonNullable<import('vitest/config').UserConfig['test']>} test
 * @returns {Promise<import('vitest/config').UserConfig>}
 */
export async function createTestConfig(configEnv, test) {
  const loaded = await loadConfigFromFile(
    configEnv,
    fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
  )
  if (!loaded) {
    throw new Error('Unable to load the Vite configuration for tests')
  }
  return mergeConfig(loaded.config, {
    test: {
      environment: 'node',
      env: { DATABASE_FILENAME: ':memory:' },
      testTimeout: 5000,
      hookTimeout: 5000,
      restoreMocks: true,
      ...test,
    },
  })
}
