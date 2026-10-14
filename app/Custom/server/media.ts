import type { Express } from 'express'
import express from 'express'
import sharp from 'sharp'
import { resolveUploadPath, uploadRoot } from './files'

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
  app.get('/images/resized/:size/{*path}', async (req, res, next) => {
    const widths: Record<string, number> = {
      small: 320,
      middle: 960,
      big: 1920,
    }
    const width = widths[String(req.params.size)]
    if (!width) {
      res.sendStatus(404)
      return
    }
    try {
      const parts = req.params.path
      const path = Array.isArray(parts) ? parts.join('/') : String(parts)
      const buffer = await sharp(resolveUploadPath(path))
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp()
        .toBuffer()
      res
        .type('webp')
        .set('Cache-Control', 'public, max-age=86400')
        .send(buffer)
    } catch (error) {
      if (
        error instanceof Error &&
        /Input file is missing|Invalid upload path/.test(error.message)
      ) {
        res.sendStatus(404)
        return
      }
      next(error)
    }
  })
}
