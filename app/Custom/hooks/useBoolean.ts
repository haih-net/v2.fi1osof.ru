import { useCallback, useState } from 'react'
export function useBoolean(
  initial = false,
): [boolean, () => void, () => void, () => void] {
  const [value, setValue] = useState(initial)
  return [
    value,
    useCallback(() => setValue(true), []),
    useCallback(() => setValue(false), []),
    useCallback(() => setValue((v) => !v), []),
  ]
}
