import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const AdminChatDialogueStyled = styled.section`
  max-width: 1000px;
  margin: auto;
  padding: 24px 16px 48px;
  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 24px;
  }
  code,
  .metadata {
    overflow-wrap: anywhere;
    color: ${theme.colors.text.secondary};
    font-size: 13px;
  }
  .content {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }
  [role='alert'] {
    color: #a52424;
  }
  @media (min-width: 800px) {
    padding: 40px 32px 64px;
  }
`
