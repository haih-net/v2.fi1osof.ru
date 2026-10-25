import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const AdminPageStyled = styled.section`
  max-width: 1120px;
  margin: auto;
  padding: 32px 16px 64px;
  h1 {
    margin: 0 0 12px;
    font-size: 32px;
  }
  .intro {
    color: ${theme.colors.text.secondary};
    margin: 0 0 32px;
  }
  nav {
    display: grid;
    gap: 20px;
  }
  .section-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 24px;
    background: ${theme.backgrounds.paper};
    border: 1px solid ${theme.colors.border};
    border-radius: 16px;
    color: ${theme.colors.primary};
    text-decoration: none;
    box-shadow: ${theme.shadows.sm};
  }
  .section-card:hover {
    border-color: ${theme.colors.primary};
  }
  .section-card strong {
    display: block;
    font-size: 20px;
    margin-bottom: 8px;
  }
  .description {
    display: block;
    color: ${theme.colors.text.secondary};
    line-height: 1.6;
  }
  .icon {
    font-size: 24px;
  }
  .arrow {
    margin-left: auto;
    font-size: 24px;
  }
  @media (min-width: 800px) {
    padding: 56px 32px 96px;
    h1 {
      font-size: 40px;
    }
    nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`
