import sharp from 'sharp'
import { RGBColor, WHITE } from '../interfaces'

/**
 * Flatten image with alpha channel to specified background color
 */
export async function flattenAlphaToBackground(
  imageBuffer: Buffer,
  background: RGBColor = WHITE,
): Promise<Buffer> {
  const img = sharp(imageBuffer)
  const metadata = await img.metadata()

  if (metadata.hasAlpha) {
    return img.flatten({ background }).png().toBuffer()
  }

  return imageBuffer
}
