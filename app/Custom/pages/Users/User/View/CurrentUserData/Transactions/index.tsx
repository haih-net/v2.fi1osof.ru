import React from 'react'
import { useSearchParams } from 'react-router'
import { useMyTransactionsWithCountQuery } from 'app/gql/generated'
import {
  TransactionsStyled,
  TransactionsHeaderStyled,
  TransactionsListStyled,
  TransactionsEmptyStyled,
} from './styles'
import { Pagination } from 'app/Custom/components/Pagination'
import { Transaction } from './Transaction'

const PAGE_SIZE = 10
const PAGE_PARAM = 'txPage'

export const Transactions: React.FC = () => {
  const [params] = useSearchParams()
  const parsedPage = Number(params.get(PAGE_PARAM))
  const currentPage =
    Number.isSafeInteger(parsedPage) &&
    parsedPage > 0 &&
    parsedPage <= 214748365
      ? parsedPage
      : 1

  const { data, loading, error } = useMyTransactionsWithCountQuery({
    variables: { skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE },
    skip: process.env.NEXT_PUBLIC_CRYPTO_ENABLED !== 'true',
    fetchPolicy: 'cache-and-network',
  })

  const transactions = data?.myTransactions ?? []
  const totalCount = data?.myTransactionsCount ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    process.env.NEXT_PUBLIC_CRYPTO_ENABLED === 'true' && (
      <TransactionsStyled>
        <TransactionsHeaderStyled>Transactions</TransactionsHeaderStyled>

        {error ? (
          <p role="alert">{error.message}</p>
        ) : loading && !data ? (
          <p role="status">Загрузка…</p>
        ) : transactions.length === 0 && !loading ? (
          <TransactionsEmptyStyled>No transactions yet</TransactionsEmptyStyled>
        ) : (
          <TransactionsListStyled>
            {transactions.map((node) => (
              <Transaction key={node.id} node={node} />
            ))}
          </TransactionsListStyled>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageParam={PAGE_PARAM}
        />
      </TransactionsStyled>
    )
  )
}
