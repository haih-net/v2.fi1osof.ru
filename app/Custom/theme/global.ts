import { styled } from '@linaria/react'
import { theme } from '.'

export const HtmlStyled = styled.html`
  font-family: ${theme.font};
  color: ${theme.colors.foreground};
  background: ${theme.backgrounds.page};
  line-height: 1.5;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  scroll-padding-top: 112px;
  body {
    margin: 0;
  }
  &,
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    outline: ${theme.outline};
  }
  :where(h1, h2, h3, h4, p, ul) {
    margin: 0;
    padding: 0;
  }
  button,
  input,
  textarea,
  select {
    font: inherit;
  }
  button {
    touch-action: manipulation;
  }
  button:enabled {
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
  img {
    max-width: 100%;
  }
  :where(&) a {
    color: inherit;
    text-decoration: none;
  }
  :where(&) a:hover {
    text-decoration: underline;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`
