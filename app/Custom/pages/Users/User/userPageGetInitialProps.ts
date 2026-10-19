import { usersLoaderQueriesEnabled } from '../config'
import type { LoaderFunctionArgs } from 'react-router'
import { UserDocument } from 'app/gql/generated'
import { getInitialProps } from '../../../components/pages/_App/getInitialProps.server'
import { getUserQueryVariables } from './helpers'
export async function userPageGetInitialProps({
  params,
  context,
}: LoaderFunctionArgs) {
  const userId = params.userId
  if (!userId) {
    throw new Response('Пользователь не найден', { status: 404 })
  }
  if (!usersLoaderQueriesEnabled) {
    return { userId, user: undefined }
  }
  return getInitialProps(context, async (apolloClient) => {
    const result = await apolloClient.query({
      query: UserDocument,
      variables: getUserQueryVariables(userId),
    })
    if (!result.data?.object) {
      throw new Response('Пользователь не найден', { status: 404 })
    }
    return { userId, user: result.data.object }
  })
}
