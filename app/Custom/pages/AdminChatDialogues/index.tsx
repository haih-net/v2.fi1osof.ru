import type React from 'react'
import { Link } from 'react-router'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { DialogueList } from './DialogueList'
import { AdminChatDialoguesStyled } from './styles'

export const AdminChatDialoguesPage: React.FC = () => {
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <AdminChatDialoguesStyled>
      <h1 tabIndex={-1}>Диалоги чата</h1>
      {userLoading ? (
        <p role="status">Проверка доступа…</p>
      ) : user?.sudo === true ? (
        <>
          <nav aria-label="Навигация по админке">
            <Link to="/admin-panel">Админка</Link>
            <Link to="/admin-panel/chat/messages">Сообщения чата</Link>
          </nav>
          <DialogueList />
        </>
      ) : (
        <p>
          Доступ разрешён только администраторам.{' '}
          {!user && <Link to="/signin">Войти</Link>}
        </p>
      )}
    </AdminChatDialoguesStyled>
  )
}
