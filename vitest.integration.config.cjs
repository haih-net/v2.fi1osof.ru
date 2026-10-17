// @ts-check
/** @type {import("vitest/config").UserConfig} */
module.exports = {
  test: {
    environment: 'node',
    env: { DATABASE_FILENAME: ':memory:' },
    include: ['tests/integration/**/*.test.{ts,mjs}'],
    testTimeout: 15000,
    hookTimeout: 15000,
    restoreMocks: true,
  },
}
