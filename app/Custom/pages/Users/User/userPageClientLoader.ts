import { usersLoaderQueriesEnabled } from '../config'
import type { ClientLoaderFunctionArgs } from 'react-router'
import { initializeApollo } from 'app/gql/apolloClient'
import { UserDocument } from 'app/gql/generated'
import { getUserQueryVariables } from './helpers'

export async function userPageClientLoader({
  params,
}: ClientLoaderFunctionArgs) {
  const userId = params.userId
  if (!userId) {
    throw new Response('Пользователь не найден', { status: 404 })
  }
  if (!usersLoaderQueriesEnabled) {
    return { userId, user: undefined }
  }
  const client = initializeApollo({ withWs: false })
  const result = await client.query({
    query: UserDocument,
    variables: getUserQueryVariables(userId),
    fetchPolicy: 'network-only',
  })
  if (!result.data?.object) {
    throw new Response('Пользователь не найден', { status: 404 })
  }
  return { userId, user: result.data.object }
}
