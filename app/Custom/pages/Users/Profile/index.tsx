import type * as React from 'react'
import { Link } from 'react-router'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { CustomLayoutSectionStyled } from 'app/Custom/Layout/styles'
import { UserPageView } from '../User/View'

export const ProfilePage: React.FC = () => {
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <CustomLayoutSectionStyled>
      {userLoading ? (
        <p role="status">Загрузка профиля…</p>
      ) : user ? (
        <UserPageView key={user.id} user={user} />
      ) : (
        <p>
          Для просмотра профиля необходимо <Link to="/signin">войти</Link>.
        </p>
      )}
    </CustomLayoutSectionStyled>
  )
}
