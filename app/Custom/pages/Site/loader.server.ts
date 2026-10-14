import type { LoaderFunctionArgs } from 'react-router'
import createApolloClient from '../../../gql/apolloClient/createApolloClient'
import { loadPage } from './data'

export async function loader({ request }: LoaderFunctionArgs) {
  const client = createApolloClient({ withWs: false })
  try {
    return await loadPage(client, new URL(request.url))
  } finally {
    client.stop()
  }
}
