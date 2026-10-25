import { beforeEach, expect, onTestFinished } from 'vitest'

beforeEach(() => {
  // Keep console output visible, including errors caught by application code.
  const original = console.error
  const errors: unknown[][] = []
  console.error = (...details: unknown[]): void => {
    errors.push(details)
    original.apply(console, details)
  }
  onTestFinished(() => {
    try {
      expect(errors, 'Unexpected console.error during the test').toEqual([])
    } finally {
      console.error = original
    }
  })
})
