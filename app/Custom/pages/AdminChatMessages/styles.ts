import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const AdminChatMessagesStyled = styled.section`
  padding: 24px 16px;
  max-width: 1440px;
  margin: auto;
  nav {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin: 16px 0;
  }
  .message-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    margin-top: 20px;
  }
  .message-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    background: white;
  }
  .message-meta,
  .message-usage,
  .usage-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 20px;
    overflow-wrap: anywhere;
  }
  .message-meta {
    padding-bottom: 12px;
    border-bottom: 1px solid ${theme.colors.border};
  }
  .message-usage {
    margin: 12px 0;
    font-size: 13px;
  }
  .usage-summary {
    padding: 16px;
    background: ${theme.backgrounds.page};
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
  }
  .usage-summary strong,
  .usage-summary small {
    flex-basis: 100%;
  }
  .content {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    min-width: 0;
  }
  code {
    display: block;
    overflow-wrap: anywhere;
    font-size: 12px;
  }
  .dialogue {
    margin-top: 32px;
    padding: 16px;
    border: 1px solid ${theme.colors.border};
  }
  .dialogue article {
    margin-top: 20px;
    border-top: 1px solid ${theme.colors.border};
    padding-top: 16px;
  }
  .dialogue > button {
    margin: 12px 0;
  }
  [role='alert'] {
    color: #a52424;
  }
  [data-success='false'] {
    color: #a52424;
    font-weight: 700;
  }
  [data-success='true'] {
    color: #287143;
  }
  @media (min-width: 800px) {
    padding: 40px 24px;
  }
`
