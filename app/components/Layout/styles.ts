import { styled } from '@linaria/react'

export const HtmlStyled = styled.html`
  & {
    font-family: system-ui, sans-serif;
    color: #10172a;
    background: #fff;
    line-height: 1.6;
  }

  body {
    margin: 0;
  }
`

export const LayoutStyled = styled.div`
  &,
  & * {
    box-sizing: border-box;
  }

  & {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow-wrap: anywhere;
  }

  .site-container {
    width: min(100%, 72rem);
    margin-inline: auto;
    padding-inline: 1rem;
  }

  .site-header {
    border-bottom: 1px solid #dce3ee;
  }

  .site-header__content,
  .site-footer__content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding-block: 1.25rem;
  }

  & a {
    color: #0052cc;
    text-underline-offset: 0.2em;
  }

  & .site-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: #10172a;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    text-decoration: none;
  }

  .site-navigation {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .site-navigation a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    text-decoration: none;
  }

  .site-navigation a[aria-current='page'],
  .site-navigation a:hover {
    text-decoration: underline;
  }

  .site-navigation a[aria-current='page'] {
    font-weight: 700;
  }

  .site-main {
    flex: 1;
    padding-block: 2rem;
  }

  .site-footer {
    border-top: 1px solid #dce3ee;
  }

  .site-footer p {
    margin: 0;
  }

  .skip-link {
    position: fixed;
    inset-block-start: 0.5rem;
    inset-inline-start: 1rem;
    z-index: 10;
    padding: 0.75rem 1rem;
    background: #fff;
    transform: translateY(calc(-100% - 1rem));
  }

  .skip-link:focus {
    transform: translateY(0);
  }

  @media (min-width: 48rem) {
    .site-container {
      padding-inline: 2rem;
    }

    .site-header__content,
    .site-footer__content {
      flex-direction: row;
      align-items: center;
      gap: 2rem;
    }

    .site-header nav,
    .site-footer__content > a:last-child {
      margin-inline-start: auto;
    }

    .site-main {
      padding-block: 3rem;
    }
  }
`
