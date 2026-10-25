import { styled } from '@linaria/react'

export const ConceptGalleryThumbnailsStyled = styled.div`
  position: relative;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 5px 3px 10px;
  margin-top: 10px;
  scrollbar-width: thin;
  max-width: 100%;

  button {
    flex: 0 0 104px;
    height: 72px;
    padding: 3px;
    border: 2px solid transparent;
    border-radius: 12px;
    background: transparent;
  }
  button[aria-current='true'] {
    border-color: #1676ce;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 7px;
    display: block;
  }
`

export const ConceptGalleryStyled = styled.section`
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  button {
    font: inherit;
    cursor: pointer;
  }
  .gallery-stage {
    position: relative;
  }
  .gallery-viewport {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    border-radius: 20px;
    background: #edf0f2;
  }
  .gallery-viewport::-webkit-scrollbar {
    display: none;
  }
  .gallery-slide {
    flex: 0 0 100%;
    min-width: 0;
    aspect-ratio: 16 / 9;
    max-height: 620px;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
  .gallery-slide img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .gallery-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    background: #fff;
    color: #17202d;
    box-shadow: 0 2px 12px #0002;
  }
  .gallery-arrow:hover:not(:disabled) {
    background: #eff6ff;
  }
  .gallery-arrow:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .gallery-prev {
    left: 16px;
  }
  .gallery-next {
    right: 16px;
  }
  .gallery-counter {
    position: absolute;
    bottom: 16px;
    right: 16px;
    border-radius: 20px;
    padding: 6px 12px;
    background: #17202dcc;
    color: #fff;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }

  .gallery-viewport {
    border-radius: 14px;
  }
  .gallery-slide {
    aspect-ratio: 4 / 3;
  }
  .gallery-arrow {
    width: 36px;
    height: 36px;
  }
  .gallery-prev {
    left: 8px;
  }
  .gallery-next {
    right: 8px;
  }
  .gallery-counter {
    right: 10px;
    bottom: 10px;
  }
  ${ConceptGalleryThumbnailsStyled} {
    gap: 6px;
    margin-top: 6px;
    button {
      flex-basis: 80px;
      height: 58px;
    }
  }
  @media (min-width: 601px) {
    .gallery-viewport {
      border-radius: 20px;
    }
    .gallery-slide {
      aspect-ratio: 16 / 9;
    }
    .gallery-arrow {
      width: 44px;
      height: 44px;
    }
    .gallery-prev {
      left: 16px;
    }
    .gallery-next {
      right: 16px;
    }
    .gallery-counter {
      right: 16px;
      bottom: 16px;
    }
    ${ConceptGalleryThumbnailsStyled} {
      gap: 10px;
      margin-top: 10px;
      button {
        flex-basis: 104px;
        height: 72px;
      }
    }
  }
`
