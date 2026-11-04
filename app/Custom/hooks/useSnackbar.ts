import { createContext, useContext } from 'react'
export interface SnackbarContextValue {
  addMessage: (
    message: string,
    options?: {
      variant?: 'success' | 'error' | 'info' | 'warning'
      /** Время до автоскрытия в мс: по умолчанию 3000, 0 — не скрывать. */
      autoHideDuration?: number
    },
  ) => void
}
export const SnackbarContext = createContext<SnackbarContextValue | null>(null)
export function useSnackbar(): SnackbarContextValue | null {
  return useContext(SnackbarContext)
}
