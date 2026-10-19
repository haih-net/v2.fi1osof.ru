import React from 'react'
import { UserFragment } from 'app/gql/generated'
import {
  UsersViewStyled,
  UsersViewGridStyled,
  UsersViewCardStyled,
} from './styles'
import { SeparatorStyled } from 'app/Custom/components/Separator/styles'
import { StatusToggler } from '../User/View/StatusToggler'
import { FormattedDate } from 'app/Custom/components/FormattedDate'
import { Pagination } from 'app/Custom/components/Pagination'
import { UserLink } from 'app/Custom/components/Link/User'

type UsersViewProps = {
  users: UserFragment[]
  count: number
  page: number
  limit: number
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  count,
  limit,
  page,
}) => {
  const totalPages = count ? Math.ceil(count / limit) : 0

  return (
    <UsersViewStyled>
      <h1>Пользователи</h1>
      <p className="list-description">Участники сообщества · {count}</p>

      <UsersViewGridStyled>
        {users.map((user) => (
          <UsersViewCardStyled key={user.id}>
            <UserLink user={user} />

            <SeparatorStyled />

            <FormattedDate value={user.createdAt} />
            <StatusToggler user={user} />
          </UsersViewCardStyled>
        ))}
      </UsersViewGridStyled>

      <Pagination currentPage={page} totalPages={totalPages} />
    </UsersViewStyled>
  )
}
