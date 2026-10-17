import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const ChatMessageToggleButtonStyled = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  font-size: 0;
  padding: 0;
  border-radius: 50%;
  border: 1px solid ${theme.colors.primary};
  flex-shrink: 0;
  cursor: pointer;

  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }
`

export const ChatMessageToolbarStyled = styled.div`
  &,
  > * {
    display: flex;
    align-items: center;
  }

  justify-content: space-between;
`

export const ChatMessageStyled = styled.article`
  margin-top: 20px;
  padding: 20px;
  border: 1px solid ${theme.colors.border};
  border-radius: 12px;
  background: ${theme.backgrounds.paper};

  .page-url {
    overflow-wrap: anywhere;
  }

  &[data-role='assistant'] {
    border-left-width: 8px;
  }
  &[data-role='user'] {
    border-left-width: 4px;
  }

  &[data-success='false'] {
    border-color: #a52424;
  }
  &[data-success='true'] {
    border-color: #287143;
  }
`
