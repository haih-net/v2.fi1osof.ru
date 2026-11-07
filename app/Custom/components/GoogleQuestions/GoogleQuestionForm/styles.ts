import { styled } from '@linaria/react'

export const GoogleQuestionFormStyled = styled.form`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e3e8ef;
  label {
    display: block;
    margin-bottom: 12px;
    font-size: 18px;
    font-weight: 600;
  }
  .google-search-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border: 1px solid #dadce0;
    border-radius: 28px;
    background: #fff;
    box-shadow: 0 2px 8px #3c404314;
    transition: box-shadow 150ms ease;
  }
  .google-search-box:focus-within {
    border-color: #4285f4;
    box-shadow: 0 0 0 3px #4285f426;
  }
  input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 48px;
    padding: 12px 16px;
    border: 0;
    border-radius: 20px;
    outline: none;
    background: transparent;
    color: #202124;
    font: inherit;
    font-size: 16px;
  }
  input::placeholder {
    color: #5f6368;
    opacity: 1;
  }
  button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    gap: 8px;
    min-height: 48px;
    padding: 10px 16px;
    border: 1px solid transparent;
    border-radius: 24px;
    background:
      linear-gradient(#fff, #fff) padding-box,
      conic-gradient(#4285f4, #34a853, #fbbc05, #ea4335, #4285f4) border-box;
    color: #1f1f1f;
    font: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  button:hover {
    background:
      linear-gradient(#f0f4ff, #f0f4ff) padding-box,
      conic-gradient(#4285f4, #34a853, #fbbc05, #ea4335, #4285f4) border-box;
  }
  button img {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
  .google-hint,
  .google-error {
    margin: 10px 12px 0;
    font-size: 13px;
    line-height: 1.5;
  }
  .google-hint {
    color: #5f6368;
  }
  .google-error {
    color: #b3261e;
  }
  @media (min-width: 760px) {
    .google-search-box {
      flex-direction: row;
      align-items: center;
      border-radius: 36px;
    }
    input {
      flex: 1;
    }
  }
`
