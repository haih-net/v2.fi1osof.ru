import { setupMedia } from '../app/Custom/server/media'
import './env'
import express from 'express'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { logEvent, startMetricsServer } from './observability'
import type { ServerBuild } from 'react-router'
import type { ViteDevServer } from 'vite'

import { setupGraphqlMiddleware } from './graphqlMiddleware'

const dev = process.env.NODE_ENV === 'development'
const port = Number(process.env.PORT || 3000)

let stopGraphql: (() => Promise<void>) | null = null
let vite: ViteDevServer | null = null
let stopping = false
let metricsServer: ReturnType<typeof startMetricsServer> = null

function setupShutdown(server: ReturnType<typeof createServer>) {
  const shutdown = async (signal: string) => {
    if (stopping) {
      return
    }
    stopping = true
    logEvent('info', 'shutdown', { signal })
    metricsServer?.close()

    if (stopGraphql) {
      await stopGraphql()
    }

    if (vite) {
      await vite.close()
    }

    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

async function startServer() {
  const app = express()
  app.set('trust proxy', true)
  app.disable('x-powered-by')

  setupMedia(app)

  const httpServer = createServer(app)

  // GraphQL middleware
  stopGraphql = await setupGraphqlMiddleware(app, httpServer)

  const { createRequestHandler } = await import('@react-router/express')

  if (dev) {
    // Development: Vite dev server with HMR
    const { createServer: createVite } = await import('vite')
    vite = await createVite({
      server: { middlewareMode: true, ws: { server: httpServer } },
      appType: 'custom',
    })

    app.use(vite.middlewares)

    app.all(
      '/{*splat}',
      createRequestHandler({
        build: () => {
          if (!vite) {
            throw new Error('Can not create vite')
          }
          return vite.ssrLoadModule(
            'virtual:react-router/server-build',
          ) as unknown as Promise<ServerBuild>
        },
      }),
    )
  } else {
    // Production: serve static files and prebuilt SSR bundle
    const sirv = (await import('sirv')).default
    app.use(sirv('build/client', { extensions: [] }))

    const buildUrl: string = pathToFileURL(
      resolve('build/server/index.js'),
    ).href
    const build: ServerBuild = (await import(buildUrl)) as ServerBuild
    app.all('/{*splat}', createRequestHandler({ build }))
  }

  metricsServer = startMetricsServer()
  setupShutdown(httpServer)

  httpServer.listen(port, '0.0.0.0', () => {
    logEvent('info', 'server_ready', { port })
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
