import { styled } from '@linaria/react'
import { ChatButton } from '../Chat/ChatWidget/styles'

export const SiteShell = styled.div`
  &,
  & * {
    box-sizing: border-box;
  }
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #202630;
  font:
    16px/1.55 Arial,
    sans-serif;
  overflow-wrap: anywhere;
  a {
    color: inherit;
  }
  h1,
  h2,
  h3,
  h4 {
    font-family: inherit;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  h1 {
    font-size: 34px;
  }
  h2 {
    font-size: 30px;
  }
  h3 {
    font-size: 22px;
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
    outline: 2px solid #bd302b;
    outline-offset: 4px;
  }
  ${ChatButton} {
    background: #bd302b;
    box-shadow: 0 4px 12px #00000020;
  }
  .wrap {
    max-width: 1200px;
    padding: 0 20px;
    margin: auto;
    width: 100%;
  }
  > header {
    background: #fff;
  }
  .header-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 76px;
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 14px;
    text-decoration: none;
    flex-shrink: 0;
  }
  .brand strong {
    color: #202630;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -1px;
  }
  .brand-accent {
    color: #bd302b;
  }
  .brand > span {
    color: #73757a;
    font-size: 14px;
  }
  .full-name {
    display: none;
  }
  .activity-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 10px;
    font-size: 12px;
    color: #62666d;
  }
  .activity-row a {
    text-decoration: none;
  }
  .timer {
    min-width: 0;
  }
  .desktop-nav {
    display: none;
    margin-left: auto;
    gap: 24px;
  }
  nav a {
    font-size: 14px;
    text-decoration: none;
    white-space: nowrap;
  }
  nav a[aria-current='page'],
  nav a:hover {
    color: #bd302b;
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .contact-button {
    display: none;
    background: #bd302b;
    color: #fff;
    padding: 11px 18px;
    border-radius: 3px;
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
  }
  .contact-button:hover {
    background: #a72622;
  }
  .burger {
    border: 0;
    background: none;
    padding: 8px;
    font-size: 24px;
    margin-left: auto;
  }
  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 18px 0;
    border-top: 1px solid #e8e8e8;
  }
  main.wrap {
    flex: 1;
    margin: 0 auto;
    padding-top: 24px;
    padding-bottom: 32px;
    min-width: 0;
  }
  > footer {
    background: #fff;
    border-top: 1px solid #e8e8e8;
    padding: 24px 0;
    margin-top: 24px;
  }
  .footer-grid {
    display: grid;
    gap: 24px;
  }
  .footer-grid p {
    margin: 5px 0;
  }
  .footer-grid nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px;
  }
  .footer-grid > div:last-child {
    font-size: 13px;
    color: #62666d;
  }
  .footer-grid > div:last-child a {
    text-decoration: none;
  }
  .muted {
    color: #73757a;
    font-size: 12px;
  }
  .account {
    display: flex;
    gap: 16px;
    margin-top: 20px;
    align-items: center;
    font-size: 13px;
  }
  .account button {
    background: none;
    border: 0;
    text-decoration: underline;
    padding: 0;
  }
  @media (min-width: 768px) {
    .wrap {
      padding-inline: 32px;
    }
    .full-name {
      display: inline;
    }
    .contact-button {
      display: inline-flex;
    }
    .header-row {
      gap: 24px;
    }
    .footer-grid {
      grid-template-columns: 1.3fr 1fr;
    }
    main.wrap {
      padding-top: 20px;
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
    .footer-grid {
      grid-template-columns: 1.2fr 1.3fr auto;
      align-items: start;
    }
  }
`
