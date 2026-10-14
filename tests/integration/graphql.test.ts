import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer, type Server } from 'node:http'
import { afterEach, test, vi } from 'vitest'
import express, { type Express } from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import {
  graphqlObservability,
  startMetricsServer,
} from '../../server/observability'
import { db } from '../../server/database'
import type { Context } from '../../server/schema/builder'

afterEach(() => vi.unstubAllEnvs())

test('GraphQL execution errors with HTTP 200 are recorded as server failures', async ({
  onTestFinished,
}) => {
  vi.stubEnv('METRICS_PORT', '0')
  vi.stubEnv('METRICS_HOST', '127.0.0.1')
  const metrics: Server | null = startMetricsServer()
  assert.ok(metrics)
  onTestFinished(
    () => new Promise<void>((resolve) => metrics.close(() => resolve())),
  )
  await once(metrics, 'listening')
  const api: ApolloServer<Context> = new ApolloServer<Context>({
    typeDefs: 'type Query { fail: String }',
    resolvers: {
      Query: {
        fail: (): never => {
          throw new Error('Fixture failure')
        },
      },
    },
    plugins: [graphqlObservability],
  })
  await api.start()
  onTestFinished(() => api.stop())
  const app: Express = express()
  app.use(
    '/api',
    express.json(),
    expressMiddleware(api, {
      context: async ({ req }) => ({ req, db, currentUser: null }),
    }),
  )
  const server: Server = createServer(app)
  onTestFinished(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  )
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  const metricsAddress = metrics.address()
  assert.ok(address && typeof address === 'object')
  assert.ok(metricsAddress && typeof metricsAddress === 'object')
  const response: Response = await fetch(
    `http://127.0.0.1:${address.port}/api`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ fail }' }),
    },
  )
  assert.equal(response.status, 200)
  assert.match(await response.text(), /Fixture failure/)
  const text: string = await (
    await fetch(`http://127.0.0.1:${metricsAddress.port}/metrics`)
  ).text()
  assert.match(text, /haih_graphql_errors_total\{kind="server"\} 1/)
})
