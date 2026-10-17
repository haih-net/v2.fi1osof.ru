import { styled } from '@linaria/react'

export const MainPageViewStyled = styled.div`
  section + section {
    margin-top: 52px;
  }
  h1 {
    font-size: clamp(28px, 3vw, 38px);
    margin: 0 0 20px;
  }
  h1[tabindex='-1']:focus {
    outline: none;
  }
  h2 {
    font-size: clamp(26px, 2.7vw, 34px);
    margin: 0 0 24px;
  }
  h3 {
    font-size: 21px;
    margin: 0 0 18px;
  }
  p {
    margin: 0 0 14px;
  }
  p:last-child {
    margin-bottom: 0;
  }
  img {
    display: block;
    max-width: 100%;
    height: auto;
  }
  figure {
    margin: 0;
    min-width: 0;
  }
  figcaption {
    margin-top: 10px;
    font-size: 14px;
  }
  .intro {
    display: grid;
    gap: 28px;
  }
  .portrait {
    width: 100%;
    max-width: 440px;
    justify-self: center;
    object-fit: cover;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
    margin-top: 24px;
  }
  .primary-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 14px 24px;
    background: #bd302b;
    color: #fff;
    font-weight: 700;
    text-decoration: none;
    border-radius: 3px;
  }
  .primary-action:hover {
    background: #a72622;
  }
  .text-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #bd302b;
    border: 0;
    padding: 0;
    background: none;
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
    text-align: left;
  }
  .text-action:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .two-columns {
    display: grid;
    gap: 24px;
  }
  .two-columns > p {
    margin-bottom: 0;
  }
  .technology-title {
    margin-top: 28px;
  }
  .technology-strip {
    overflow-x: auto;
    padding-bottom: 10px;
  }
  .technology-strip img {
    width: 100%;
    min-width: 640px;
  }
  .service-row {
    display: grid;
    gap: 14px;
    padding: 24px 0;
  }
  .service-row + .service-row {
    border-top: 1px solid #e8e8e8;
  }
  .service-row h3 {
    margin: 0;
    font-size: 20px;
    line-height: 1.4;
  }
  .service-row > .text-action {
    align-self: start;
  }
  .chat-preview {
    border: 1px solid #ececec;
    border-radius: 6px;
    padding: 20px;
    box-shadow: 0 2px 12px #00000008;
  }
  .chat-heading {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 15px;
  }
  .chat-heading img {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    object-position: center 20%;
  }
  .chat-greeting {
    display: inline-block;
    padding: 14px;
    border: 1px solid #ececec;
    border-radius: 6px;
    font-size: 14px;
    color: #62666d;
    margin-top: 18px;
  }
  .chat-launch {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin-top: 28px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #73757a;
    text-align: left;
  }
  .chat-launch > span:first-child {
    flex: 1;
    border: 1px solid #e8e8e8;
    padding: 12px;
    border-radius: 4px;
    font-size: 14px;
  }
  .send-icon {
    display: grid;
    place-items: center;
    border-radius: 4px;
    background: #bd302b;
    color: #fff;
    width: 46px;
    height: 46px;
  }
  .project-images img {
    width: 100%;
    aspect-ratio: 1.5;
    object-fit: cover;
    border: 1px solid #e8e8e8;
  }
  .project-images figcaption {
    font-weight: 700;
  }
  .project-description {
    display: grid;
    gap: 16px;
    margin-top: 20px;
  }
  .project-description p {
    margin: 0;
  }
  .upcoming-projects {
    margin-top: 24px;
  }
  .placeholder-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .placeholder-pair > div {
    aspect-ratio: 1.9;
    background: #ededee;
  }
  .upcoming-projects figcaption {
    color: #62666d;
  }
  .telegram-action {
    margin-top: 8px;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @media (min-width: 768px) {
    .intro {
      grid-template-columns: 1.2fr 1fr;
      gap: 32px;
      align-items: start;
    }
    .portrait {
      max-width: none;
      height: 100%;
      max-height: 550px;
    }
    .two-columns {
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .service-row {
      grid-template-columns: 230px 1fr;
      gap: 12px 30px;
    }
    .service-row > .text-action {
      grid-column: 2;
    }
    .project-description {
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 32px;
    }
  }
  @media (min-width: 1100px) {
    section + section {
      margin-top: 60px;
    }
    .intro {
      grid-template-columns: 1.2fr 1fr;
      gap: 40px;
    }
    .service-row {
      grid-template-columns: 235px 1fr 190px;
      gap: 30px;
    }
    .service-row > .text-action {
      grid-column: auto;
      justify-self: end;
      padding-top: 5px;
    }
  }
`
