import { styled } from '@linaria/react'

export const InsertFilesUploaderButtonStyled = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`
