import UploadHttpLink from 'apollo-upload-client/UploadHttpLink.mjs'
import { ErrorLink } from '@apollo/client/link/error'
import { SetContextLink } from '@apollo/client/link/context'
import { getMainDefinition } from '@apollo/client/utilities'
import { OperationDefinitionNode } from 'graphql'
import { createClient } from 'graphql-ws'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  CombinedGraphQLErrors,
  ServerError,
} from '@apollo/client'

import { typePolicies } from './typePolicies'
import { apolloErrorReporter } from './errorReporting'
import { createApolloClientProps } from './interfaces'
import type { IncomingHttpHeaders } from 'http'

export * from './interfaces'

type FetchWithProgress = (
  input: RequestInfo | URL,
  init?: RequestInit & { onUploadProgress?: (percent: number) => void },
) => Promise<Response>

const fetchWithUploadProgress: FetchWithProgress = (input, init) => {
  const onProgress = init?.onUploadProgress

  if (typeof window === 'undefined' || !onProgress || !init?.body) {
    return fetch(input, init)
  }

  return new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(init.method || 'POST', input.toString())

    if (init.headers) {
      const headers = init.headers as Record<string, string>
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        }),
      )
    }

    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))

    if (init.signal) {
      init.signal.addEventListener('abort', () => xhr.abort())
    }

    xhr.send(init.body as XMLHttpRequestBodyInit)
  })
}

let wsLink: GraphQLWsLink | undefined

function getEndpoint(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/`
  }

  // GraphQL обслуживается тем же Node.js-сервисом, что и сайт.
  const port: number = Number(process.env.PORT || 3000)
  return `http://127.0.0.1:${port}/api/`
}

/**
 * Creates and returns WebSocket client for GraphQL
 */
export function getWsClient(withWs: boolean) {
  if (typeof window === 'undefined' || !withWs) {
    return undefined
  }

  const endpoint = getEndpoint()
  const wsUri = new URL(endpoint)

  let protocol = wsUri.protocol
  switch (protocol) {
    case 'http:':
      protocol = 'ws:'
      break
    case 'https:':
    default:
      protocol = 'wss:'
      break
  }

  wsUri.protocol = protocol

  return createClient({
    url: wsUri.toString(),
    connectionParams: async () => {
      const params: { Authorization?: string } = {}

      if (typeof localStorage !== 'undefined') {
        const token = localStorage.getItem('token')
        if (token) {
          params.Authorization = `Bearer ${token}`
        }
      }

      return params
    },
  })
}

/**
 * Function for getting WebSocket connection.
 * Used for GraphQL subscriptions.
 */
export function getWsLink(withWs: boolean) {
  /**
   * On the server side we don't need WebSocket support.
   * We connect websockets only on the browser side.
   */
  if (typeof window === 'undefined') {
    return
  }

  /**
   * If client already exists, return it
   */
  if (wsLink) {
    return wsLink
  }

  const wsClient = getWsClient(withWs)

  if (wsClient) {
    wsLink = new GraphQLWsLink(wsClient)
  }

  return wsLink
}

function createApolloClient({ withWs, appContext }: createApolloClientProps) {
  const endpoint = getEndpoint()

  const errorLink = new ErrorLink(({ error }) => {
    if (CombinedGraphQLErrors.is(error)) {
      error.errors.forEach(({ message, locations, path }) =>
        apolloErrorReporter.error(
          `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        ),
      )
    } else if (ServerError.is(error)) {
      apolloErrorReporter.error(`[Server error]: ${error.message}`)
    } else if (error) {
      apolloErrorReporter.error(`[Network error]: ${error.message}`)
    }
  })

  const uploadLink = new UploadHttpLink({
    uri: endpoint,
    fetch: fetchWithUploadProgress as typeof fetch,
  })

  const secureUploadLink = new SetContextLink((prevContext, operation) => {
    const headers = {
      ...prevContext.headers,
      'x-apollo-operation-name': operation.operationName || 'Unknown',
      'apollo-require-preflight': 'true',
    }

    return {
      headers,
    }
  }).concat(uploadLink)

  const httpLink = secureUploadLink

  const authMiddleware = new ApolloLink((operation, forward) => {
    operation.setContext(({ headers }: { headers?: IncomingHttpHeaders }) => {
      if (
        !headers &&
        // @ts-expect-error types
        appContext?.ctx.req?.headers
      ) {
        headers = {
          // @ts-expect-error types
          ...appContext?.ctx.req?.headers,
          accept: 'application/json',
        }
      }

      const token =
        (typeof globalThis !== 'undefined' && 'localStorage' in globalThis
          ? globalThis.localStorage?.getItem('token')
          : null) || null

      if (token) {
        headers = {
          ...headers,
          authorization: `Bearer ${token}`,
        }
      }

      return {
        headers,
      }
    })

    return forward(operation)
  })

  let wsHttpLink: ApolloLink = httpLink

  const wsLink = withWs ? getWsLink(withWs) : undefined

  if (wsLink) {
    wsHttpLink = ApolloLink.split(
      (request) => {
        const { query } = request

        const { kind, operation } = getMainDefinition(
          query,
        ) as OperationDefinitionNode
        return kind === 'OperationDefinition' && operation === 'subscription'
      },
      wsLink,
      httpLink,
    )
  }

  // const link = concat(authMiddleware, httpLink)
  const link = errorLink.concat(wsHttpLink)

  const client = new ApolloClient({
    ssrMode: typeof window === 'undefined',
    link: ApolloLink.from([authMiddleware, link]),
    cache: new InMemoryCache({
      /**
       * Here you can specify logic for individual object fields,
       * for example, merging data when performing lazy loading.
       */
      typePolicies,

      // https://www.apollographql.com/docs/react/data/fragments/#defining-possibletypes-manually
      possibleTypes: {
        ResourceInterface: ['Activity'],
        ModxResourceInterface: [
          'ModxResource',
          'ModxProductsCategory',
          'ModxProduct',
        ],
      },
    }),
  })

  return client
}

export default createApolloClient
