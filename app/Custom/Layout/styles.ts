import { styled } from '@linaria/react'
import { theme } from '../theme'

export const CustomLayoutSectionStyled = styled.section`
  max-width: 1328px;
  padding: 44px 24px;
  margin: auto;

  @media (min-width: ${theme.breakpoints.sm}px) {
    padding: 64px 40px;
  }
`

export const CustomLayoutGridStyled = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;

  @media (min-width: ${theme.breakpoints.xs}px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: ${theme.breakpoints.sm}px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
  }
`

export const CustomLayoutMainStyled = styled.main`
  flex: 1;
  min-width: 0;
`

export const CustomLayoutStyled = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  color: ${theme.colors.foreground};
  background: ${theme.backgrounds.page};
  .ai-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 14px 20px;
    background: ${theme.colors.primary};
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    transition: background 0.2s;
    text-decoration: none;
  }
  .ai-button:hover {
    background: #28583f;
    text-decoration: none;
  }
  .skip-link {
    position: absolute;
    top: -100px;
    left: 20px;
    padding: 12px 20px;
    background: white;
    z-index: 1100;
  }
  .skip-link:focus {
    top: 12px;
  }
`

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
  *,
  *::before,
  *::after {
    box-sizing: border-box;
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
  :focus-visible {
    outline: none;
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
