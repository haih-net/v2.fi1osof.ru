import type { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import {
  createContext,
  type MiddlewareFunction,
  type RouterContextProvider,
} from 'react-router'
import createApolloClient from '../gql/apolloClient/createApolloClient'

export class RequestContext {
  private apolloClient: ApolloClient | undefined

  constructor(private readonly request: Request) {}

  getApolloClient = (): ApolloClient => {
    if (!this.apolloClient) {
      const headers: Record<string, string> = {}
      const authorization = this.request.headers.get('authorization')
      if (authorization) {
        headers.authorization = authorization
      }
      this.apolloClient = createApolloClient({
        withWs: false,
        appContext: { ctx: { req: { headers } } },
      })
    }
    return this.apolloClient
  }

  getApolloState(): NormalizedCacheObject | undefined {
    return this.apolloClient?.cache.extract() as
      NormalizedCacheObject | undefined
  }

  dispose(): void {
    this.apolloClient?.stop()
  }
}

export const requestContext = createContext<RequestContext>()

export function getRequestApollo(
  context: Readonly<RouterContextProvider>,
): ApolloClient {
  return context.get(requestContext).getApolloClient()
}

export const requestMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const services = new RequestContext(request)
  context.set(requestContext, services)
  try {
    return await next()
  } finally {
    services.dispose()
  }
}
