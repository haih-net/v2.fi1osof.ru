import { useContext } from 'react'
import { Context, type AppContextValue } from '../components/AppContext'

// Cold dev SSR can temporarily lose context during WyW/Vite module reloads.
// Consumers must handle null; this workaround does not fix module invalidation.
export function useAppContext(): AppContextValue | null {
  return useContext(Context)
}
