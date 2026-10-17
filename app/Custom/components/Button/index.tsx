import { styled } from '@linaria/react'
export const Button = styled.button`
  padding: 8px 14px;
  border: 1px solid currentColor;
  border-radius: 6px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`
