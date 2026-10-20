import { styled } from '@linaria/react'
import { TextFieldStyled } from '../controls/TextField/styles'

export const FormControlLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
`
export const FormControlHelperText = styled.div`
  font-size: 12px;
  margin-top: 4px;
`
export const FormControlToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  &:empty {
    display: none;
  }
`
export const FormControlContent = styled.div`
  display: contents;
`
export const FormControlStyled = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  &[data-disabled='true'] {
    opacity: 0.6;
    pointer-events: none;
  }
  &[data-error='true'] {
    ${TextFieldStyled} {
      border-color: #b7410e;
    }
    ${FormControlHelperText} {
      color: #b7410e;
    }
  }
`
