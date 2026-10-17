import type { Express } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

export function setupTileServer(app: Express): void {
  const target = process.env.TILE_SERVER_PROXY_TARGET
  if (!target) {
    app.use('/styles', (_request, response) => {
      response.status(503).send('Tile server is not configured')
    })
    return
  }
  app.use(
    '/styles',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      proxyTimeout: 15000,
      logger: console,
    }),
  )
}
