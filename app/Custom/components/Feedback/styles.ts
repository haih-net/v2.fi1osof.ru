import { styled } from '@linaria/react'

export const FeedbackDialog = styled.dialog`
  width: min(540px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  box-sizing: border-box;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 24px;
  background: #fff;
  color: #252525;
  &::backdrop {
    background: #0008;
  }
  h2 {
    margin: 0 35px 24px 0;
  }
  .close {
    position: absolute;
    right: 12px;
    top: 12px;
    font-size: 26px;
    border: 0;
    background: none;
    cursor: pointer;
  }
  form,
  label {
    display: grid;
    gap: 10px;
  }
  form {
    gap: 20px;
  }
  input,
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 12px;
    border: 1px solid #999;
    border-radius: 4px;
    font: inherit;
  }
  textarea {
    min-height: 150px;
    resize: vertical;
  }
  .submit {
    background: #bd302b;
    color: white;
    padding: 12px;
    border: 0;
    border-radius: 4px;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  [role='alert'] {
    color: #a72622;
  }
`
