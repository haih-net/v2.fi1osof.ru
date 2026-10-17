import type * as React from 'react'
import { Link, useLocation } from 'react-router'
import { PaginationStyled } from './styles'

export const Pagination: React.FC<{
  currentPage: number
  totalPages: number
}> = ({ currentPage, totalPages }) => {
  const { pathname, search } = useLocation()
  const pageLink = (page: number): string => {
    const params = new URLSearchParams(search)
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    return pathname + (params.size ? `?${params}` : '')
  }
  if (totalPages <= 1) {
    return null
  }
  return (
    <PaginationStyled aria-label="Страницы каталога">
      {currentPage > 1 && (
        <Link to={pageLink(currentPage - 1)} rel="prev">
          Назад
        </Link>
      )}
      <span aria-current="page">
        Страница {currentPage} из {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link to={pageLink(currentPage + 1)} rel="next">
          Далее
        </Link>
      )}
    </PaginationStyled>
  )
}
