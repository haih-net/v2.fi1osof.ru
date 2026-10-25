// @ts-check

/** @type {import("vite").UserConfigFnPromise} */
module.exports = async (configEnv) => {
  const { createTestConfig } = await import('./vitest.shared.mjs')
  return createTestConfig(configEnv, {
    silent: false,
    setupFiles: ['tests/setup.ts'],
    // Preserve stylesheet URLs instead of replacing them with empty CSS mocks.
    css: { include: [/\.css\?url(?:&|$)/] },
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
