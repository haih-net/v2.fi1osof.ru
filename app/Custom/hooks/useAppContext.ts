import { useContext } from 'react'
import { Context, type AppContextValue } from '../components/AppContext'

export function useAppContext(): AppContextValue {
  const context = useContext(Context)

  if (!context) {
    throw new Error('Please, provide AppContextProvider')
  }

  return context
}
