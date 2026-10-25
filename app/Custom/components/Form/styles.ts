import { styled } from '@linaria/react'
import { theme } from '../../theme'
export const FormStyled = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
  label {
    font-size: 14px;
    font-weight: 700;
  }
  input:not([type='file']):not([type='checkbox']),
  textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid ${theme.colors.border};
    border-radius: 10px;
    background: white;
    color: ${theme.colors.text.primary};
    font: inherit;
    margin-bottom: 8px;
    min-height: 46px;
    &:disabled {
      background: #f2f3ef;
      opacity: 0.7;
    }
  }
  [role='alert'] {
    margin: 4px 0;
    padding: 12px 14px;
    border: 1px solid #f0c9c5;
    border-radius: 10px;
    background: #fff2f1;
    color: #a52c2c;
    font-size: 14px;
    overflow-wrap: anywhere;
  }
`
