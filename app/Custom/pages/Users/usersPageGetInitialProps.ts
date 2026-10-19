import { usersLoaderQueriesEnabled } from './config'
import type { LoaderFunctionArgs } from 'react-router'
import { UsersConnectionDocument, MeDocument } from 'app/gql/generated'
import { getUsersQueryVariables } from './helpers'
import { getInitialProps } from '../../components/pages/_App/getInitialProps.server'

export async function usersPageGetInitialProps({
  request,
  context,
}: LoaderFunctionArgs) {
  const raw = new URL(request.url).searchParams.get('page')
  const page = raw === null ? 1 : Number(raw)
  if (!Number.isSafeInteger(page) || page < 1 || (page - 1) * 10 > 2147483647) {
    throw new Response('Страница не найдена', { status: 404 })
  }
  if (!usersLoaderQueriesEnabled) {
    return { page }
  }
  return getInitialProps(context, async (apolloClient) => {
    const me = apolloClient.readQuery({ query: MeDocument })
    const variables = getUsersQueryVariables({ currentUser: me?.me, page })
    const result = await apolloClient.query({
      query: UsersConnectionDocument,
      variables,
    })
    if (page > 1 && !result.data?.users.length) {
      throw new Response('Страница не найдена', { status: 404 })
    }
    return { page }
  })
}
