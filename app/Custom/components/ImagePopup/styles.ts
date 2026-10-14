import { styled } from '@linaria/react'

export const ImagePopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
`

export const ImagePopupContainer = styled.div`
  position: relative;
  cursor: default;
`

export const ImagePopupClose = styled.button`
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #fff;
  color: #333;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #e5e7eb;
  }
`

export const ImagePopupContent = styled.img`
  max-width: 90vw;
  max-height: 90dvh;
  object-fit: contain;
  display: block;
`
