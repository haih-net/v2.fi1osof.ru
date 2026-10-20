import { styled } from '@linaria/react'

export const TextFieldStyled = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 8px 16px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid #e6e1d6;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  &:hover:not(:disabled) {
    border-color: #a8a29e;
  }
  &:focus {
    outline: 2px solid #9e4e2b;
    outline-offset: 2px;
  }
  &:disabled {
    background: #f5f4f0;
  }
`
