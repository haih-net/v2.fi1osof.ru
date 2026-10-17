import { styled } from '@linaria/react'
import { theme } from '../../../theme'

export const SignInFormStyled = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;

  label {
    font-weight: 700;
  }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    background: ${theme.backgrounds.paper};
    color: ${theme.colors.text.primary};
    font: inherit;
    margin-bottom: 8px;
  }
  button {
    background: ${theme.colors.primary};
    color: white;
    padding: 14px;
    font: inherit;
    font-weight: 700;
  }
  [role='alert'] {
    margin: 0;
    color: #a52424;
    overflow-wrap: anywhere;
  }
`
