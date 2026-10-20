// @ts-check

/** @type {import("vite").UserConfigFnPromise} */
module.exports = async (configEnv) => {
  const { createTestConfig } = await import('./vitest.shared.mjs')
  return createTestConfig(configEnv, {
    include: ['tests/agents/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 300000,
    hookTimeout: 15000,
    env: {
      DATABASE_FILENAME: ':memory:',
      CHAT_EMAIL_NOTIFICATIONS_ENABLED: 'false',
      CHAT_TOOL_EXPLANATIONS_ENABLED: 'false',
    },
  })
}
