import { styled } from '@linaria/react'
export const SnackbarStackStyled = styled.div`
  position: fixed;
  z-index: 1200;
  right: 16px;
  bottom: 90px;
  width: min(380px, calc(100vw - 32px));
  display: grid;
  gap: 10px;
  pointer-events: none;
`
export const SnackbarMessageStyled = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #c7d8ec;
  background: #eef5ff;
  color: #24558b;
  box-shadow: 0 8px 28px #1d30251a;
  pointer-events: auto;
  overflow-wrap: anywhere;
  span {
    flex: 1;
    min-width: 0;
  }
  &[data-variant='success'] {
    background: #eaf6ed;
    color: #246a39;
    border-color: #c5dfcb;
  }
  &[data-variant='error'] {
    background: #fff2f1;
    color: #a52c2c;
    border-color: #f0c9c5;
  }
  &[data-variant='warning'] {
    background: #fff6de;
    color: #79500a;
    border-color: #ead7a2;
  }
  button {
    padding: 0 4px;
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
`
