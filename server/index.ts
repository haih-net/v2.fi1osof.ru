import './env'
import { db } from './database'
import express, { type ErrorRequestHandler } from 'express'
import { logDevError } from './errorLogging'
import { setupChat } from './chat'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { logEvent, startMetricsServer } from './observability'
import type { ServerBuild } from 'react-router'
import type { ViteDevServer } from 'vite'

import { setupMedia } from './schema/types/media'
import { setupSitemap } from './sitemap'

import { setupGraphqlMiddleware } from './middleware/graphql'
import { imageResizerMiddleware } from './middleware/imageResizer'

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
  await db.raw('SELECT 1')
  const app = express()
  app.set('trust proxy', true)
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    if (/^\/(en|vi)(?=\/|\?|$)/.test(req.url)) {
      const destination = req.url.replace(/^\/(en|vi)\/*/, '/')
      res.redirect(301, destination)
      return
    }
    next()
  })

  setupMedia(app)

  setupSitemap(app)
  setupChat(app)

  app.use('/images/resized/', imageResizerMiddleware)
  app.use('/assets/images/', imageResizerMiddleware)
  setupMedia(app)

  const httpServer = createServer(app)

  // GraphQL middleware
  stopGraphql = await setupGraphqlMiddleware(app, httpServer)

  const { createRequestHandler } = await import('@react-router/express')

  if (dev) {
    // Development: Vite dev server with HMR
    const { createServer: createVite } = await import('vite')
    vite = await createVite({
      cacheDir: `node_modules/.vite-${port}`,
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
    app.use(
      express.static(resolve('shared'), { dotfiles: 'deny', index: false }),
    )
    const sirv = (await import('sirv')).default
    app.use(sirv('build/client', { extensions: [] }))

    const buildUrl: string = pathToFileURL(
      resolve('build/server/index.js'),
    ).href
    const build: ServerBuild = (await import(buildUrl)) as ServerBuild
    app.all('/{*splat}', createRequestHandler({ build }))
  }

  const logRequestError: ErrorRequestHandler = (error, req, _res, next) => {
    logDevError('http.error', error, { method: req.method, path: req.path })
    next(error)
  }
  app.use(logRequestError)

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
