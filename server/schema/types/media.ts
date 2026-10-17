import type { Express } from 'express'
import express from 'express'
import { uploadRoot } from './files'

export function setupMedia(app: Express): void {
  app.use(
    '/uploads',
    express.static(uploadRoot(), {
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Content-Disposition', 'attachment')
      },
    }),
    (_req, res) => {
      res.sendStatus(404)
    },
  )
}
