import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  ImagePopupOverlay,
  ImagePopupContainer,
  ImagePopupClose,
  ImagePopupContent,
} from './styles'

interface ImagePopupProps {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
}

export const ImagePopup: React.FC<ImagePopupProps> = ({
  src,
  alt,
  isOpen,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  if (!isOpen || !mounted) {
    return null
  }

  return createPortal(
    <ImagePopupOverlay onClick={onClose}>
      <ImagePopupContainer onClick={handleContainerClick}>
        <ImagePopupClose onClick={onClose} aria-label="Close">
          ×
        </ImagePopupClose>
        <ImagePopupContent src={src} alt={alt ?? ''} />
      </ImagePopupContainer>
    </ImagePopupOverlay>,
    document.body,
  )
}
