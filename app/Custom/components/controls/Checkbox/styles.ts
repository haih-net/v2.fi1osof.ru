import { styled } from '@linaria/react'

export const CheckboxWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
`
export const CheckboxInput = styled.input`
  width: 18px;
  height: 18px;
  margin: 0;
  cursor: pointer;
  accent-color: #9e4e2b;
  &:focus-visible {
    outline: 2px solid #9e4e2b;
    outline-offset: 2px;
  }
`
export const CheckboxLabel = styled.span`
  font-size: 14px;
  color: inherit;
`
