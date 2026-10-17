import sharp, { Metadata, Sharp } from 'sharp'

function resizeMax(
  img: Sharp,
  width: number,
  height: number,
  metadata: Metadata,
) {
  const { width: originWidth, height: originHeight } = metadata

  if (
    originWidth &&
    originHeight &&
    (width < originWidth || height < originHeight)
  ) {
    img
      .resize({ fit: 'inside' })
      .resize(width, height)
      .resize({ fit: 'inside' })
  }
}

export async function resizeImg(img: Sharp, type: string, metadata: Metadata) {
  switch (type) {
    case 'origin':
      break

    case 'avatar':
      img.resize(200, 200)

      break

    case 'thumb':
      img.resize({
        width: 150,
        height: 150,
        fit: 'cover',
        position: sharp.gravity.north,
      })

      break

    case 'small':
      img.resize({
        width: 200,
        height: 160,
        fit: 'inside',
      })

      break

    case 'middle':
      img.resize({
        width: 900,
        height: 900,
        fit: 'inside',
        withoutEnlargement: true,
      })

      break

    case 'big':
      img.resize({ fit: 'inside' })

      resizeMax(img, 1600, 1600, metadata)

      break

    case 'slider_thumb':
      img.resize({
        width: 400,
        height: 300,
        fit: 'cover',
      })

      break

    case 'slider_dot_thumb':
      img.resize({
        width: 40,
        height: 30,
        fit: 'cover',
      })

      break

    case 'marker_thumb':
      img.resize({
        width: 200,
        height: 130,
        fit: 'cover',
      })

      break

    default:
      throw new Error('Wrong image type')
  }

  return img
}
