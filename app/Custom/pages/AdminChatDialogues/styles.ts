import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const AdminChatDialoguesStyled = styled.section`
  padding: 24px 16px;
  max-width: 1440px;
  margin: auto;

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin: 16px 0;
  }

  .dialogue-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  article {
    min-width: 0;
    padding: 16px;
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    overflow-wrap: anywhere;
  }

  .content {
    white-space: pre-wrap;
  }

  .dialogue-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;

    > a,
    > span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    svg {
      flex-shrink: 0;
    }
  }

  [role='alert'],
  .error-count {
    color: #a52424;
  }

  @media (min-width: 800px) {
    padding: 40px 24px;
  }
`
