import type React from 'react'
import { Link } from 'react-router'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { AdminChatDialoguePageView } from './View'
import { AdminChatDialogueStyled } from './styles'

export const AdminChatDialoguePage: React.FC = () => {
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <AdminChatDialogueStyled>
      {userLoading ? (
        <p role="status">Проверка доступа…</p>
      ) : user?.sudo === true ? (
        <AdminChatDialoguePageView />
      ) : (
        <p>
          Доступ разрешён только администраторам.{' '}
          {!user && <Link to="/signin">Войти</Link>}
        </p>
      )}
    </AdminChatDialogueStyled>
  )
}
