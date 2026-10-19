import { styled } from '@linaria/react'

export const BalanceStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const BalanceAddressStyled = styled.div`
  font-size: 12px;
  color: #666;
  word-break: break-all;
`

export const BalanceAmountStyled = styled.div`
  font-weight: 600;
`

export const BalanceFormStyled = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

export const BalanceInputStyled = styled.input`
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 120px;

  &:disabled {
    opacity: 0.6;
  }
`

export const BalanceStatusStyled = styled.div`
  font-size: 13px;
  color: #666;
`
