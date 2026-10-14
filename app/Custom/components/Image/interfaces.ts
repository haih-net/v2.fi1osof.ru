import { ImgHTMLAttributes } from 'react'
type ImageSize = 'small' | 'middle' | 'big'

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
  size?: ImageSize
}
