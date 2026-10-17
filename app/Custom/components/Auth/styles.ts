import { styled } from '@linaria/react'
import { AuthProvidersStyled } from './AuthProviders/styles'

export const AuthFormFooterStyled = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  ${AuthProvidersStyled} {
    display: contents;
  }

  [type='submit'] {
    flex: 1;
  }
`
