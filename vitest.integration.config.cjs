// @ts-check

/** @type {import("vite").UserConfigFnPromise} */
module.exports = async (configEnv) => {
  const { createTestConfig } = await import('./vitest.shared.mjs')
  return createTestConfig(configEnv, {
    include: ['tests/integration/**/*.test.{ts,mjs}'],
    testTimeout: 15000,
    hookTimeout: 15000,
  })
}
