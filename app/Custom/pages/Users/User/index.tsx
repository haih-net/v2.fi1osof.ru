import { useAppContext } from 'app/Custom/hooks/useAppContext'
import type * as React from 'react'
import { Link, useLoaderData } from 'react-router'
import { useUserQuery } from 'app/gql/generated'
import { CustomLayoutSectionStyled } from 'app/Custom/Layout/styles'
import { UserPageView } from './View'
import { getUserQueryVariables } from './helpers'
import type { userPageGetInitialProps } from './userPageGetInitialProps'
export const UserPage: React.FC = () => {
  const { userId } = useLoaderData<typeof userPageGetInitialProps>()
  const { user, userLoading } = useAppContext()
  const { data, loading, error } = useUserQuery({
    ssr: false,
    skip: userLoading || user?.sudo !== true,
    variables: getUserQueryVariables(userId),
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
        <p role="alert">Не удалось загрузить профиль: {error.message}</p>
      ) : loading && !data ? (
        <p role="status">Загрузка…</p>
      ) : data?.object ? (
        <UserPageView key={data.object.id} user={data.object} />
      ) : (
        <p>Пользователь не найден</p>
      )}
    </CustomLayoutSectionStyled>
  )
}
