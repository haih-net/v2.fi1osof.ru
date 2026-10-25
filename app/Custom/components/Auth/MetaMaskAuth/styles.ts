import { styled } from '@linaria/react'
import { theme } from '../../../theme'

export const MetaMaskAuthStyled = styled.div`
  width: 100%;
  button {
    width: 100%;
    padding: 14px;
    font: inherit;
    font-weight: 700;
    background: ${theme.backgrounds.paper};
    color: ${theme.colors.primary};
  }
  [role='alert'] {
    color: #a52424;
    overflow-wrap: anywhere;
    margin: 12px 0 0;
  }
`
