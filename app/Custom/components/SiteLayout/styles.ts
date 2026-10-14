import { styled } from '@linaria/react'

export const SiteShell = styled.div`
  &,
  & * {
    box-sizing: border-box;
  }
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #faf8f3;
  color: #1a1a1a;
  font:
    15px/1.55 Arial,
    sans-serif;
  overflow-wrap: anywhere;
  a {
    color: inherit;
  }
  h1,
  h2,
  h3,
  h4 {
    font-family: Georgia, serif;
    line-height: 1.25;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  h1 {
    font-size: 30px;
  }
  h2 {
    font-size: 24px;
  }
  h3 {
    font-size: 20px;
  }
  button,
  input,
  select {
    font: inherit;
  }
  button,
  select {
    cursor: pointer;
  }
  :focus-visible {
    outline: 2px solid #1e3a8a;
    outline-offset: 4px;
  }
  .wrap {
    max-width: 1260px;
    padding: 0 16px;
    margin: auto;
    width: 100%;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: #faf8f3f5;
    border-bottom: 1px solid #e6e1d6;
  }
  .header-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 76px;
  }
  .brand {
    text-decoration: none;
    flex-shrink: 0;
  }
  .brand strong {
    font:
      600 17px Georgia,
      serif;
  }
  .brand small {
    display: none;
    color: #8a8578;
    font: 12px monospace;
    margin-top: 5px;
  }
  .full-name {
    display: none;
  }
  .timer {
    flex: 1;
    min-width: 0;
    border: 1px dashed #e6e1d6;
    background: #f3efe6;
    padding: 5px 8px;
    color: #5a5a5a;
    font: 12px monospace;
    text-decoration: none;
    border-radius: 3px;
  }
  .desktop-nav {
    display: none;
    gap: 20px;
  }
  nav a {
    font: 13px monospace;
    text-decoration: none;
    white-space: nowrap;
  }
  nav a[aria-current='page'],
  nav a:hover {
    color: #1e3a8a;
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .burger {
    border: 0;
    background: none;
    padding: 8px;
    font-size: 22px;
  }
  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 18px 0;
    border-top: 1px solid #e6e1d6;
  }
  main.wrap {
    flex: 1;
    margin: 0 auto;
    padding-top: 24px;
    padding-bottom: 32px;
    min-width: 0;
  }
  footer {
    background: #f3efe6;
    border-top: 1px solid #e6e1d6;
    padding: 40px 0 32px;
    margin-top: 64px;
  }
  .footer-grid {
    display: grid;
    gap: 24px;
  }
  .footer-grid nav {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .caption {
    color: #8a8578;
    font: 12px monospace;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .muted {
    color: #8a8578;
    font: 12px/1.6 monospace;
  }
  .account {
    display: flex;
    gap: 16px;
    margin-top: 20px;
    align-items: center;
  }
  .account button {
    background: none;
    border: 0;
    text-decoration: underline;
    padding: 0;
  }
  @media (min-width: 768px) {
    .full-name,
    .brand small {
      display: block;
    }
    .brand strong .full-name {
      display: inline;
    }
    .header-row {
      gap: 24px;
    }
    .footer-grid {
      grid-template-columns: 2fr 1fr 1fr;
    }
    main.wrap {
      padding-top: 32px;
    }
  }
  @media (min-width: 1100px) {
    .desktop-nav {
      display: flex;
    }
    .burger,
    .mobile-nav {
      display: none;
    }
  }
`
