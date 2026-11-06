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
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <CustomLayoutSectionStyled>
      {userLoading ? (
        <p role="status">Проверка доступа…</p>
      ) : user?.sudo !== true ? (
        <p>
          Доступ разрешён только администраторам.{' '}
          {!user && <Link to="/signin">Войти</Link>}
        </p>
      ) : (
        <AdminUserProfile userId={userId} />
      )}
    </CustomLayoutSectionStyled>
  )
}

function AdminUserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useUserQuery({
    ssr: false,
    variables: getUserQueryVariables(userId),
  })
  if (error) {
    return <p role="alert">Не удалось загрузить профиль: {error.message}</p>
  }
  if (loading && !data) {
    return <p role="status">Загрузка…</p>
  }
  return data?.object ? (
    <UserPageView key={data.object.id} user={data.object} />
  ) : (
    <p>Пользователь не найден</p>
  )
}
