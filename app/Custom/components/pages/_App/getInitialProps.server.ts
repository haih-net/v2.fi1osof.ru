import type { ApolloClient } from '@apollo/client'
import type { RouterContextProvider } from 'react-router'
import { getRequestApollo } from '../../../../request/context.server'

export async function getInitialProps<Props extends object>(
  context: Readonly<RouterContextProvider>,
  getPageProps: (client: ApolloClient) => Promise<Props>,
): Promise<Props> {
  return getPageProps(getRequestApollo(context))
}
