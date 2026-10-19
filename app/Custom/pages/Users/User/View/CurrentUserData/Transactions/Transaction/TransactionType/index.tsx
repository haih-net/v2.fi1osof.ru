import React from 'react'
import { TransactionType } from 'app/gql/generated'
import { TransactionTypeStyled } from '../styles'

interface TransactionTypeProps {
  type: TransactionType
  title?: string | null
  isIncoming: boolean
}

const getTransactionTypeName = (type: TransactionType): string => {
  switch (type) {
    case TransactionType.TRANSFERIN:
      return 'Top-up'
    case TransactionType.TRANSFEROUT:
      return 'Transfer'
    case TransactionType.TOPUP:
      return 'Balance top-up'
  }
}

export const TransactionTypeComponent: React.FC<TransactionTypeProps> = ({
  type,
  title,
  isIncoming,
}) => {
  const typeName = getTransactionTypeName(type)

  return (
    <TransactionTypeStyled data-incoming={isIncoming}>
      {typeName}
      {title && `: ${title}`}
    </TransactionTypeStyled>
  )
}
