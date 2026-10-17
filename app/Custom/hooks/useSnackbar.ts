import { createContext, useContext } from 'react'
export interface SnackbarContextValue {
  addMessage: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info' | 'warning' },
  ) => void
}
export const SnackbarContext = createContext<SnackbarContextValue | null>(null)
export function useSnackbar(): SnackbarContextValue | null {
  return useContext(SnackbarContext)
}
