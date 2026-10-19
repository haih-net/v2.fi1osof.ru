import { styled } from '@linaria/react'
import { Link } from 'react-router'
export const UserLinkStyled = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
  img {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 50%;
  }
  &[data-size='small'] img {
    width: 24px;
    height: 24px;
  }
  &[data-size='big'] img {
    width: 48px;
    height: 48px;
  }
`
