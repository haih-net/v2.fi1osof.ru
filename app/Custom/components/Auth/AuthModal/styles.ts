import { theme } from '../../../theme'
import { styled } from '@linaria/react'

export const AuthModalFooter = styled.div`
  margin-top: ${theme.spacing.lg};
  text-align: center;
  font-size: 14px;
  color: ${theme.colors.text.secondary};
`

export const AuthModalLink = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.primary};
  cursor: pointer;
  font-size: inherit;
  padding: 0;

  &:hover {
    opacity: 0.8;
  }
`
