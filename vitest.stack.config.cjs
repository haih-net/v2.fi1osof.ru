// @ts-check

/** @type {import("vite").UserConfigFnPromise} */
module.exports = async (configEnv) => {
  const { createTestConfig } = await import('./vitest.shared.mjs')
  return createTestConfig(configEnv, {
    include: ['tests/stack/**/*.test.{ts,mjs}'],
    testTimeout: 90000,
    hookTimeout: 90000,
  })
}
