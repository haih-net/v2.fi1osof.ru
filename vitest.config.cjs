// @ts-check

/** @type {import("vite").UserConfigFnPromise} */
module.exports = async (configEnv) => {
  const { createTestConfig } = await import('./vitest.shared.mjs')
  return createTestConfig(configEnv, {
    include: [
      'tests/unit/**/*.test.{ts,tsx,mjs}',
      'app/**/*.test.{ts,tsx}',
      'server/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['app/components/seo/**/*.ts', 'server/**/*.ts'],
      exclude: ['**/types.ts'],
      reporter: ['text', 'html', 'lcov'],
    },
  })
}
