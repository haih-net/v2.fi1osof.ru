import type React from 'react'
import { Link } from 'react-router'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { AdminPageStyled } from './styles'

export const AdminPage: React.FC = () => {
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <AdminPageStyled>
      <h1 tabIndex={-1}>Админка</h1>
      {userLoading ? (
        <p role="status">Проверка доступа…</p>
      ) : user?.sudo === true ? (
        <>
          <p className="intro">Управление сайтом</p>
          <nav aria-label="Разделы админки">
            <Link className="section-card" to="/admin-panel/errors">
              <span>
                <strong>Page errors</strong>
                <span className="description">
                  Review and resolve problematic URLs.
                </span>
              </span>
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link className="section-card" to="/admin-panel/chat/dialogues">
              <span>
                <strong>Диалоги чата</strong>
                <span className="description">
                  Диалоги от новых к старым. В каждой карточке — первое
                  сообщение.
                </span>
              </span>
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link className="section-card" to="/admin-panel/chat/messages">
              <span className="icon" aria-hidden="true">
                ☰
              </span>
              <span>
                <strong>Сообщения чата</strong>
                <span className="description">
                  Журнал сообщений пользователей и ответов помощника. Просмотр
                  полных диалогов.
                </span>
              </span>
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </nav>
        </>
      ) : (
        <p>
          Доступ разрешён только администраторам.{' '}
          {!user && <Link to="/signin">Войти</Link>}
        </p>
      )}
    </AdminPageStyled>
  )
}
