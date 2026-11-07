import { styled } from '@linaria/react'

export const GoogleQuestionsStyled = styled.div`
  && {
    margin-top: 28px;
    padding: clamp(20px, 4vw, 32px);
    border: 1px solid transparent;
    border-radius: 28px;
    background:
      linear-gradient(135deg, #f8faff, #fff 55%, #f8fcf9) padding-box,
      conic-gradient(from 45deg, #4285f4, #34a853, #fbbc05, #ea4335, #4285f4)
        border-box;
    box-shadow: 0 8px 28px #3c404312;
    color: #202124;
  }
  && .google-mode {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    color: #5f6368;
    font-size: 14px;
    font-weight: 600;
  }
  .google-mode img {
    width: 24px;
    height: 24px;
  }
  && h2 {
    font-size: clamp(22px, 3vw, 28px);
    margin-bottom: 24px;
  }
  && ul {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  && a {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 18px;
    border: 1px solid #dadce0;
    border-radius: 18px;
    background: #fff;
    color: #1a0dab;
    text-decoration: none;
    line-height: 1.5;
    transition:
      background 150ms ease,
      border-color 150ms ease;
  }
  && a:hover {
    border-color: #a8c7fa;
    background: #edf3fe;
  }
  && a span {
    flex-shrink: 0;
    color: #4285f4;
  }
  && h2 {
    margin-top: 0;
  }
  && li {
    margin: 0 0 12px;
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
`
