import React, { useMemo } from 'react'
import type { MeQuery } from 'app/gql/generated'

export type AppContextValue = {
  user: MeQuery['me']
  userLoading: boolean
}

export const Context = React.createContext<AppContextValue | null>(null)

type AppContextProviderProps = React.PropsWithChildren<{
  user: AppContextValue['user']
  userLoading: boolean
}>

export const AppContextProvider: React.FC<AppContextProviderProps> = ({
  user,
  userLoading,
  children,
}) => {
  const context = useMemo<AppContextValue>(() => {
    return { user, userLoading }
  }, [user, userLoading])

  return <Context.Provider value={context}>{children}</Context.Provider>
}
