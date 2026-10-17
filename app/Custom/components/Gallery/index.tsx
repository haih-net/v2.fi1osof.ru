import { useCallback, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from '../CatalogIcons'
import { KbConceptFragment } from '../../../gql/generated'
import { getResizedImagePath } from '../../helpers/getResizedImagePath'
import { ConceptGalleryStyled, ConceptGalleryThumbnailsStyled } from './styles'

type ConceptGalleryProps = {
  concept: KbConceptFragment
}

export const ConceptGallery: React.FC<ConceptGalleryProps> = ({ concept }) => {
  const { name, image, Files } = concept
  const viewport = useRef<HTMLDivElement>(null)
  const thumbnails = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  const images = useMemo(
    () =>
      Array.from(
        new Set(
          [image, ...(Files?.map(({ File }) => File?.path) ?? [])].filter(
            (path): path is string => !!path,
          ),
        ),
      ),
    [Files, image],
  )
  const active = Math.min(selected, images.length - 1)

  const goTo = useCallback((index: number) => {
    const target = viewport.current
    if (!target) {
      return
    }
    target.scrollTo({
      left: index * target.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(
          Math.max(
            0,
            Math.min(
              images.length - 1,
              active + (event.key === 'ArrowRight' ? 1 : -1),
            ),
          ),
        )
      }
    },
    [active, images.length, goTo],
  )
  const handleScroll = useCallback(() => {
    const target = viewport.current
    if (!target?.clientWidth) {
      return
    }
    const index = Math.round(target.scrollLeft / target.clientWidth)
    setSelected(index)
    const thumbnail = thumbnails.current?.children[index] as
      HTMLElement | undefined
    if (thumbnail && thumbnails.current) {
      thumbnails.current.scrollTo({
        left:
          thumbnail.offsetLeft -
          thumbnails.current.clientWidth / 2 +
          thumbnail.clientWidth / 2,
      })
    }
  }, [])
  const previous = useCallback(() => goTo(active - 1), [active, goTo])
  const next = useCallback(() => goTo(active + 1), [active, goTo])
  const selectThumbnail = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      goTo(Number(event.currentTarget.dataset.index))
    },
    [goTo],
  )

  if (!images.length) {
    return null
  }

  return (
    <ConceptGalleryStyled
      aria-label={`Фотографии: ${name}`}
      aria-roledescription="карусель"
    >
      <div className="gallery-stage">
        <div
          className="gallery-viewport"
          ref={viewport}
          tabIndex={0}
          aria-label="Фотографии. Используйте стрелки влево и вправо для переключения"
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
        >
          {images.map((path, index) => (
            <div
              className="gallery-slide"
              key={path}
              role="group"
              aria-roledescription="слайд"
              aria-label={`${index + 1} из ${images.length}`}
            >
              <img
                src={getResizedImagePath({ path, size: 'middle' })}
                alt={`${name} — фото ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-prev"
              onClick={previous}
              disabled={active <= 0}
              aria-label="Предыдущее фото"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="gallery-arrow gallery-next"
              onClick={next}
              disabled={active >= images.length - 1}
              aria-label="Следующее фото"
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <span
              className="gallery-counter"
              aria-live="polite"
              aria-atomic="true"
            >
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <ConceptGalleryThumbnailsStyled
          className="gallery-thumbnails"
          ref={thumbnails}
          aria-label="Выбор фотографии"
        >
          {images.map((path, index) => (
            <button
              type="button"
              key={path}
              onClick={selectThumbnail}
              data-index={index}
              aria-label={`Показать фото ${index + 1}`}
              aria-current={active === index ? 'true' : undefined}
            >
              <img
                src={getResizedImagePath({ path, size: 'slider_thumb' })}
                alt=""
                loading="lazy"
              />
            </button>
          ))}
        </ConceptGalleryThumbnailsStyled>
      )}
    </ConceptGalleryStyled>
  )
}
