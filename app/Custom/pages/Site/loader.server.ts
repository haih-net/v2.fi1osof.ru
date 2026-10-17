import { data, type LoaderFunctionArgs } from 'react-router'
import createApolloClient from '../../../gql/apolloClient/createApolloClient'
import { getInitialProps } from '../../components/pages/_App/getInitialProps.server'
import { loadPage } from './data'

export function createPageLoader(
  path: string | ((params: LoaderFunctionArgs['params']) => string),
) {
  return async ({ request, context, params }: LoaderFunctionArgs) => {
    const url = new URL(request.url)
    url.pathname = typeof path === 'string' ? path : path(params)
    const page = await getInitialProps(context, (client) =>
      loadPage(client, url, 'network-only'),
    )
    return data(page, { headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const client = createApolloClient({ withWs: false })
  try {
    return await loadPage(client, new URL(request.url))
  } finally {
    client.stop()
  }
}
