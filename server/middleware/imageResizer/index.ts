import sharp from 'sharp'
import fs from 'fs'
import mime from 'mime-types'
import { RequestHandler } from 'express'
import path from 'path'
import { parseBackgroundColor } from './helpers/parseBackgroundColor'
import { resizeImg } from './helpers/resizeImg'

const uploadsDir = path.resolve(process.cwd(), 'uploads')

const searchPaths = ['', 'images']

const srcTransforms: Array<{
  match: RegExp | string
  replace: string
}> = [
  { match: /^assets\/images\//, replace: 'images/' },
  { match: /^assets\//, replace: 'images/assets/' },
]

function findFile(src: string): string | null {
  if (src.includes('\0')) {
    return null
  }

  const srcVariants = [src]

  for (const { match, replace } of srcTransforms) {
    if (typeof match === 'string' ? src.startsWith(match) : match.test(src)) {
      srcVariants.push(src.replace(match, replace))
    }
  }

  for (const srcVariant of srcVariants) {
    for (const subdir of searchPaths) {
      const filePath = path.resolve(uploadsDir, subdir, srcVariant)
      const relativePath = path.relative(uploadsDir, filePath)

      if (
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relativePath)
      ) {
        continue
      }

      if (fs.existsSync(filePath)) {
        return filePath
      }
    }
  }

  return null
}

/**
 * Resize image
 */
export const imageResizerMiddleware: RequestHandler = async (
  req,
  res,
  _next,
) => {
  let src: string | undefined
  let type: string | undefined

  let match: RegExpMatchArray | null | undefined

  const srcPath = decodeURIComponent(req.originalUrl)

  const [pathPart, queryPart] = srcPath.split('?')
  const queryParams = new URLSearchParams(queryPart || '')
  const bgColor = queryParams.get('bg') // e.g. ?bg=white or ?bg=ff0000

  if ((match = pathPart.match(/^\/images\/resized\/([^/]+)\/(.+)/))) {
    src = match[2].replace(/^\/?uploads\//, '')
    type = match[1]
  } else if ((match = pathPart.match(/^\/assets\/images\/(.+)/))) {
    src = match[1]
    type = 'origin'
  }

  if (src && type) {
    const absPath = findFile(src)

    if (absPath) {
      const mimetype = mime.lookup(absPath)

      const contentType = mimetype

      let data

      switch (contentType) {
        case 'image/svg+xml':
          break

        default: {
          if (type === 'origin') {
            break
          }
          let img = sharp(absPath)

          const metadata = await img.metadata()

          // Flatten PNG with alpha channel to specified background color
          if (metadata.hasAlpha && bgColor) {
            const background = parseBackgroundColor(bgColor)
            img = img.flatten({ background })
          }

          data = await resizeImg(img, type, metadata)
            .then(async () => {
              if (!contentType) {
                res.status(500)
                res.send('Can not get contentType')
                return
              }

              const pipeline = img.withMetadata()

              switch (contentType) {
                case 'image/png':
                  pipeline.png()
                  break
                case 'image/webp':
                  pipeline.webp({ quality: 95 })
                  break
                case 'image/gif':
                  pipeline.gif()
                  break
                default:
                  pipeline.jpeg({ quality: 95 })
              }

              return await pipeline.toBuffer().catch((e) => {
                console.error(e)

                res.status(500)
                res.send(e.message)
              })
            })
            .catch((error) => {
              res.status(500)
              res.send(error.message)
            })

          if (!data) {
            return
          }
        }
      }

      if (data) {
        res.status(200)

        if (contentType && typeof contentType === 'string') {
          res.contentType(contentType)
        }
        res.append('Cache-Control', `public, max-age=${1000000}`)
        res.send(data)
      } else {
        res.append('Cache-Control', `public, max-age=${1000000}`)
        res.sendFile(absPath)
      }

      return
    }
  }

  res.status(404).send('File not found')
}
