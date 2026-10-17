import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const FileUploaderStyled = styled.div`
  width: 100%;
`

export const DropZoneStyled = styled.div`
  position: relative;
  min-height: 200px;
  border: 2px dashed #d9d9d9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
  padding: 20px;
  box-sizing: border-box;

  &[data-isdragging='true'] {
    border-color: ${theme.colors.primary};
    background: rgba(0, 122, 204, 0.05);
  }

  &[data-haspreview='true'] {
    border-style: solid;
    padding: 10px;
  }

  &[data-disabled='true'] {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover {
    &:not([data-disabled='true']) {
      border-color: ${theme.colors.primary};
    }
  }

  > span {
    color: #999;
    font-size: 14px;
    text-align: center;
  }
`

export const PreviewStyled = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 300px;
    object-fit: contain;
    border-radius: 6px;
  }
`

export const RemoveButtonStyled = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(220, 53, 69, 0.9);
  }
`

export const ErrorMessageStyled = styled.div`
  color: #dc3545;
  font-size: 12px;
  margin-top: 8px;
`

export const LoadingOverlayStyled = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  z-index: 10;

  span {
    color: ${theme.colors.primary};
    font-weight: 500;
  }
`

export const GeneratorActionsStyled = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  z-index: 11;
`
