import { styled } from '@linaria/react'
import { theme } from '../../theme'

export const ButtonStyled = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 700;
  background: ${theme.colors.primary};
  color: white;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    box-shadow 0.15s;
  &:hover:not(:disabled) {
    background: #28583f;
  }
  &[data-variant='secondary'] {
    background: white;
    color: ${theme.colors.text.primary};
    border-color: ${theme.colors.border};
    &:hover:not(:disabled) {
      background: #f0f3ed;
      border-color: #a8b7a9;
    }
  }
  &[data-variant='danger'] {
    background: #fff2f1;
    color: #a52c2c;
    border-color: #f0c9c5;
    &:hover:not(:disabled) {
      background: #ffe3df;
    }
  }
  &[data-variant='warning'] {
    background: #fff6de;
    color: #79500a;
    border-color: #ead7a2;
  }
  &[data-variant='success'] {
    background: #eaf6ed;
    color: #246a39;
    border-color: #c5dfcb;
  }
  &[data-variant='ghost'] {
    background: transparent;
    color: ${theme.colors.text.primary};
    &:hover:not(:disabled) {
      background: #eef1e9;
    }
  }
  &[data-size='small'] {
    min-height: 34px;
    padding: 6px 12px;
    font-size: 13px;
  }
  &:focus-visible {
    outline: 3px solid #8eae9b;
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`
