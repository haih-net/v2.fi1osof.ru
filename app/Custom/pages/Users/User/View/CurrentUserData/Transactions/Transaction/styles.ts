import { styled } from '@linaria/react'

export const TransactionItemStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
`

export const TransactionInfoStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const TransactionTypeStyled = styled.span`
  font-weight: 500;
  color: #dc3545;
  &[data-incoming='true'] {
    color: #28a745;
  }
`

export const TransactionUserStyled = styled.div`
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const TransactionAmountStyled = styled.span`
  font-weight: 600;
  color: #dc3545;
  &[data-positive='true'] {
    color: #28a745;
  }
`
