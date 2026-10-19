import React, { useCallback, useMemo, useState } from 'react'
import type { MeQuery } from 'app/gql/generated'

export type AppContextValue = {
  user: MeQuery['me']
  userLoading: boolean
  isFeedbackOpen: boolean
  openFeedback: () => void
  closeFeedback: () => void
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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const openFeedback = useCallback((): void => setIsFeedbackOpen(true), [])
  const closeFeedback = useCallback((): void => setIsFeedbackOpen(false), [])
  const context = useMemo<AppContextValue>(() => {
    return { user, userLoading, isFeedbackOpen, openFeedback, closeFeedback }
  }, [user, userLoading, isFeedbackOpen, openFeedback, closeFeedback])

  return <Context.Provider value={context}>{children}</Context.Provider>
}
