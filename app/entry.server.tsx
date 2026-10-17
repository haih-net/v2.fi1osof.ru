import { renderToReadableStream } from 'react-dom/server'
import {
  ServerRouter,
  type EntryContext,
  type RouterContextProvider,
} from 'react-router'
import { requestContext } from './request/context.server'
import { RequestApolloContext } from './gql/apolloClient/RequestApolloContext'

// Build-time rendering only. No renderer is deployed to the file server.
export default async function handleRequest(
  request: Request,
  status: number,
  headers: Headers,
  context: EntryContext,
  loadContext: RouterContextProvider,
) {
  const body = await renderToReadableStream(
    <RequestApolloContext.Provider
      value={loadContext.get(requestContext).getApolloClient}
    >
      <ServerRouter context={context} url={request.url} />
    </RequestApolloContext.Provider>,
    {
      signal: request.signal,
      onError(error) {
        status = 500
        console.error(error)
      },
    },
  )
  await body.allReady
  headers.set('Content-Type', 'text/html; charset=utf-8')
  return new Response(body, { status, headers })
}
