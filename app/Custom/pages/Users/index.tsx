import type * as React from 'react'
import { Link, useLoaderData } from 'react-router'
import { useUsersConnectionQuery } from 'app/gql/generated'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { CustomLayoutSectionStyled } from 'app/Custom/Layout/styles'
import { UsersView } from './View'
import { getUsersQueryVariables } from './helpers'
import type { usersPageGetInitialProps } from './usersPageGetInitialProps'
export const UsersPage: React.FC = () => {
  const { page } = useLoaderData<typeof usersPageGetInitialProps>()
  const { user, userLoading } = useAppContext()
  const { data, loading, error } = useUsersConnectionQuery({
    ssr: false,
    skip: userLoading || user?.sudo !== true,
    variables: getUsersQueryVariables({ currentUser: user, page }),
  })
  return (
    <CustomLayoutSectionStyled>
      {userLoading ? (
        <p role="status">Проверка доступа…</p>
      ) : user?.sudo !== true ? (
        <p>
          Доступ разрешён только администраторам.{' '}
          {!user && <Link to="/signin">Войти</Link>}
        </p>
      ) : error ? (
        <p role="alert">Не удалось загрузить пользователей: {error.message}</p>
      ) : loading && !data ? (
        <p role="status">Загрузка…</p>
      ) : (
        <UsersView
          users={data?.users ?? []}
          count={data?.usersCount ?? 0}
          limit={10}
          page={page}
        />
      )}
    </CustomLayoutSectionStyled>
  )
}
