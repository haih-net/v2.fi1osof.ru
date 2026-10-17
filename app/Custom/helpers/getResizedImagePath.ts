export type ImageSize =
  | 'avatar'
  | 'thumb'
  | 'small'
  | 'middle'
  | 'big'
  | 'origin'
  | 'slider_thumb'
  | 'slider_dot_thumb'
  | 'marker_thumb'

type GetResizedImagePathParams = {
  path: string
  size: ImageSize
}

export function getResizedImagePath({
  path,
  size,
}: GetResizedImagePathParams): string {
  return `/images/resized/${size}/${path.split('/').map(encodeURIComponent).join('/')}`
}
