import { graphqlUploadExpress } from 'graphql-upload-minimal'
import type { Express } from 'express'
import type { Server } from 'node:http'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import cors from 'cors'
import express from 'express'

import { schema } from './schema'
import { graphqlObservability, logEvent } from './observability'
import type { Context } from './schema/builder'
import { createContext } from './context'

export async function setupGraphqlMiddleware(
  app: Express,
  httpServer: Server,
): Promise<() => Promise<void>> {
  const apolloServer = new ApolloServer<Context>({
    schema,
    introspection: true,
    includeStacktraceInErrorResponses: process.env.NODE_ENV === 'development',
    plugins: [
      graphqlObservability,
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
    formatError: (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('GraphQL Error', error)
      }
      return error
    },
  })

  await apolloServer.start()

  app.use(
    '/api',
    cors<cors.CorsRequest>(),
    graphqlUploadExpress({ maxFileSize: 50 * 1024 * 1024, maxFiles: 10 }),
    express.json(),
    expressMiddleware(apolloServer, {
      context: async ({ req, res }) => {
        res.setHeader('Cache-Control', 'no-store')
        return createContext(req)
      },
    }),
  )

  logEvent('info', 'graphql_ready')

  return async () => {
    try {
      await apolloServer.stop()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (
        !message.includes('The server is not running') &&
        !message.includes('Server is not running')
      ) {
        throw err
      }
    }
  }
}
