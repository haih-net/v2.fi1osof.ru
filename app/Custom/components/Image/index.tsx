import React, { useMemo } from 'react'
import { ImageProps } from './interfaces'
import { ImageStyled } from './styles'
import { ImagePopup } from 'app/Custom/components/ImagePopup'
import { JsonLd } from 'app/components/seo/JsonLd'
import { useBoolean } from 'app/Custom/hooks/useBoolean'
import type { SchemaType } from 'app/components/seo/JsonLd/types'
function createImageObject({
  contentUrl,
  caption,
}: {
  contentUrl: string
  caption?: string
}): SchemaType {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl,
    caption,
  }
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  size = 'middle',
  ...props
}) => {
  const [isOpen, handleOpen, handleClose] = useBoolean()

  const { middle, big } = useMemo(() => {
    let middle: string | undefined
    let big: string | undefined

    const match = src.match(/^(\/images\/resized\/)([^/]+)\/(.+)$/)

    if (match) {
      middle = `${match[1]}${size}/${match[3]}`
      big = `${match[1]}big/${match[3]}`
    }

    return {
      middle: middle || src,
      big: big || src,
    }
  }, [src, size])

  const imageSchema = useMemo(
    () =>
      createImageObject({
        contentUrl: big,
        caption: alt,
      }),
    [big, alt],
  )

  return (
    <>
      <JsonLd data={imageSchema} />
      <ImageStyled
        src={middle}
        alt={alt ?? ''}
        onClick={handleOpen}
        {...props}
      />
      <ImagePopup src={big} alt={alt} isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
