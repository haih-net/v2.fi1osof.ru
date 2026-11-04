import React from 'react'
import { Link } from 'react-router'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { AdminChatMessagesStyled } from './styles'
import { MessageList } from './MessageList'

export const AdminChatMessagesPage: React.FC = () => {
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <AdminChatMessagesStyled>
      {user?.sudo === true && !userLoading && (
        <nav>
          <Link to="/admin-panel">← Админка</Link>
          <Link to="/admin-panel/chat/dialogues">Диалоги чата</Link>
        </nav>
      )}
      <h1 tabIndex={-1}>Сообщения чат-помощника</h1>
      {userLoading ? (
        <p role="status">Проверка доступа…</p>
      ) : user?.sudo === true ? (
        <MessageList />
      ) : (
        <p>
          Доступ разрешён только администраторам.{' '}
          {!user && <Link to="/signin">Войти</Link>}
        </p>
      )}
    </AdminChatMessagesStyled>
  )
}
