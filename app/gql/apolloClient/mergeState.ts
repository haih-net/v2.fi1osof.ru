import type { NormalizedCacheObject } from '@apollo/client'

export function mergeApolloState(
  existing: NormalizedCacheObject,
  incoming: NormalizedCacheObject,
): NormalizedCacheObject {
  const merged: NormalizedCacheObject = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    const previous: unknown = existing[key]
    merged[key] =
      previous &&
      typeof previous === 'object' &&
      !Array.isArray(previous) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
        ? { ...previous, ...value }
        : value
  }
  return merged
}
