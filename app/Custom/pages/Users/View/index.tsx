import React, { useCallback } from 'react'
import { Form, useNavigate } from 'react-router'
import { Button } from 'app/Custom/components/Button'
import { ManagedUserForm } from '../User/View/ManagedUserForm'
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
import { UserLink, createUserLink } from 'app/Custom/components/Link/User'
import { useBoolean } from 'app/Custom/hooks/useBoolean'

type UsersViewProps = {
  users: UserFragment[]
  count: number
  search?: string
  page: number
  limit: number
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  count,
  limit,
  page,
  search,
}) => {
  const [creating, setCreatingOn, setCreatingOff] = useBoolean(false)
  const navigate = useNavigate()
  const openUser = useCallback(
    (id: string) => {
      void navigate(createUserLink({ id }))
    },
    [navigate],
  )

  const totalPages = count ? Math.ceil(count / limit) : 0

  return (
    <UsersViewStyled>
      <h1>Пользователи</h1>
      <Form method="get" key={search ?? ''}>
        <label>
          Search by email, username or full name{' '}
          <input type="search" name="q" defaultValue={search} />
        </label>
        <Button type="submit">Search</Button>
      </Form>
      {creating ? (
        <ManagedUserForm closeForm={setCreatingOff} onCreated={openUser} />
      ) : (
        <Button onClick={setCreatingOn}>Create user</Button>
      )}
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
