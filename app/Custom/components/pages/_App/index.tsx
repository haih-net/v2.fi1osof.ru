import React from 'react'
import { ApolloProvider } from '@apollo/client/react'
import { useApollo } from 'app/gql/apolloClient'
import { useMeQuery } from 'app/gql/generated'
import { AppContextProvider } from '../../AppContext'
import { SnackbarProvider } from '../../Snackbar'

export const App: React.FC<React.PropsWithChildren> = ({ children }) => {
  const apolloClient = useApollo(undefined, false)
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
