import { styled } from '@linaria/react'

export const TransactionsStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
`

export const TransactionsHeaderStyled = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`

export const TransactionsListStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const TransactionDateStyled = styled.span`
  font-size: 12px;
  color: #999;
`

export const TransactionsEmptyStyled = styled.div`
  color: #666;
  font-size: 14px;
`

export const TransactionsPaginationStyled = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
`
