// @ts-check
/** @type {import("vitest/config").UserConfig} */
module.exports = {
  test: {
    environment: 'node',
    env: { DATABASE_FILENAME: ':memory:' },
    include: ['tests/stack/**/*.test.{ts,mjs}'],
    testTimeout: 90000,
    hookTimeout: 90000,
    restoreMocks: true,
  },
}
