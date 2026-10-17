import { logDevError } from './errorLogging'
import { createServer, type Server } from 'node:http'
import type { ApolloServerPlugin } from '@apollo/server'
import { collectDefaultMetrics, Counter, Registry } from '@prometheus-io/client'
import type { Context } from './schema/builder'

const registry: Registry = new Registry()
const graphqlErrors: Counter<'kind'> = new Counter({
  name: 'haih_graphql_errors_total',
  help: 'GraphQL errors, including errors returned with HTTP 200.',
  labelNames: ['kind'],
  registers: [registry],
})
graphqlErrors.inc({ kind: 'client' }, 0)
graphqlErrors.inc({ kind: 'server' }, 0)

export const logEvent = (
  level: 'info' | 'error',
  event: string,
  fields: Record<string, string | number> = {},
): void => {
  const line: string = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...fields,
  })
  process.stdout.write(`${line}\n`)
}

export const graphqlObservability: ApolloServerPlugin<Context> = {
  async requestDidStart() {
    return {
      async didEncounterErrors(context) {
        for (const error of context.errors) {
          const code: string = String(
            error.extensions?.code ?? 'INTERNAL_SERVER_ERROR',
          )
          const kind: 'client' | 'server' = [
            'GRAPHQL_PARSE_FAILED',
            'GRAPHQL_VALIDATION_FAILED',
            'BAD_USER_INPUT',
            'UNAUTHENTICATED',
            'FORBIDDEN',
            'PERSISTED_QUERY_NOT_FOUND',
            'PERSISTED_QUERY_NOT_SUPPORTED',
          ].includes(code)
            ? 'client'
            : 'server'
          graphqlErrors.inc({ kind })
          // Do not log queries, variables, credentials or arbitrary error messages.
          logEvent('error', 'graphql_error', { kind, code })
          logDevError('graphql.error', error.originalError ?? error, {
            operationName: context.operationName,
            path: error.path,
            code,
          })
        }
      },
    }
  },
}

/** Separate listener: never mounted on the public Express application. */
export const startMetricsServer = (): Server | null => {
  if (!process.env.METRICS_PORT) {
    return null
  }
  collectDefaultMetrics({ register: registry, prefix: 'haih_' })
  const server: Server = createServer(async (request, response) => {
    if (request.url !== '/metrics' || request.method !== 'GET') {
      response.writeHead(404).end()
      return
    }
    try {
      const body: string = await registry.metrics()
      response.writeHead(200, {
        'Content-Type': registry.contentType,
        'Cache-Control': 'no-store',
      })
      response.end(body)
    } catch {
      response.writeHead(500).end()
    }
  })
  server.listen(
    Number(process.env.METRICS_PORT),
    process.env.METRICS_HOST ?? '127.0.0.1',
  )
  return server
}
