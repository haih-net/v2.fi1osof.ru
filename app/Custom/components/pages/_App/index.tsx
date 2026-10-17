import React from 'react'
import type { NormalizedCacheObject } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { useApollo } from 'app/gql/apolloClient'
import { useMeQuery } from 'app/gql/generated'
import { AppContextProvider } from '../../AppContext'
import { SnackbarProvider } from '../../Snackbar'

interface AppProps extends React.PropsWithChildren {
  initialApolloState?: NormalizedCacheObject
}

export const App: React.FC<AppProps> = ({ children, initialApolloState }) => {
  const apolloClient = useApollo(initialApolloState, false)
  const { data, loading: userLoading } = useMeQuery({
    client: apolloClient,
    ssr: false,
  })
  const user = data?.me

  return (
    <SnackbarProvider>
      <ApolloProvider client={apolloClient}>
        <AppContextProvider user={user} userLoading={userLoading}>
          {children}
        </AppContextProvider>
      </ApolloProvider>
    </SnackbarProvider>
  )
}
