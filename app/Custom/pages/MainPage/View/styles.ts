import { styled } from '@linaria/react'

export const MainPageViewStyled = styled.div`
  section + section {
    margin-top: 56px;
  }
  h1 {
    font-size: clamp(30px, 4vw, 46px);
    margin: 0 0 24px;
  }
  h2 {
    font-size: clamp(25px, 3vw, 32px);
    margin: 0 0 20px;
  }
  h3 {
    font-size: 21px;
    margin: 28px 0 12px;
  }
  p {
    margin: 0 0 18px;
  }
  .lead {
    font-size: 22px;
  }
  .intro-layout {
    display: grid;
    gap: 24px;
    padding-block: 8px;
  }
  .intro-heading,
  .intro-description {
    min-width: 0;
  }
  .intro-name {
    margin-bottom: 14px;
    color: #62666d;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .intro h1 {
    margin: 0;
    font-size: clamp(28px, 4vw, 46px);
    line-height: 1.12;
    text-wrap: balance;
  }
  .portrait {
    display: block;
    width: 100%;
    max-width: 220px;
    height: auto;
    justify-self: center;
    border-radius: 20px;
  }
  .intro .lead {
    font-size: clamp(19px, 2.2vw, 22px);
    line-height: 1.45;
  }
  .intro-price {
    margin: 24px 0 0;
    padding: 16px 20px;
    border-left: 3px solid #bd302b;
    border-radius: 0 12px 12px 0;
    background: #faf5f4;
    line-height: 1.5;
  }
  @media (min-width: 768px) {
    .intro-layout {
      grid-template-columns: minmax(0, 1fr) minmax(220px, 32%);
      column-gap: clamp(28px, 4vw, 56px);
      row-gap: 24px;
      align-items: start;
      padding-block: 16px;
    }
    .intro-heading {
      grid-column: 1;
      grid-row: 1;
    }
    .intro-description {
      grid-column: 1;
      grid-row: 2;
    }
    .portrait {
      grid-column: 2;
      grid-row: 1 / 3;
      max-width: 360px;
      align-self: center;
      border-radius: 24px;
    }
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
`
