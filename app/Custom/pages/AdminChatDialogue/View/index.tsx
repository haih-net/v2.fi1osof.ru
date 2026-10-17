import type React from 'react'
import { Link, useParams } from 'react-router'
import { Dialogue } from '../Dialogue'
import {
  AdminChatDialoguePageViewHeaderStyled,
  AdminChatDialoguePageViewStyled,
} from './styles'

export const AdminChatDialoguePageView: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>()
  return (
    <AdminChatDialoguePageViewStyled>
      <AdminChatDialoguePageViewHeaderStyled>
        <h1 tabIndex={-1}>Диалог чат-помощника</h1>

        <nav aria-label="Навигация по админке">
          <Link to="/admin">Админка</Link>
          <Link to="/admin/chat/dialogues">← Диалоги чата</Link>
          <Link to="/admin/chat/messages">← Сообщения чата</Link>
        </nav>
      </AdminChatDialoguePageViewHeaderStyled>
      {chatId && /^[a-f0-9]{48}$/.test(chatId) ? (
        <Dialogue chatId={chatId} />
      ) : (
        <p role="alert">Некорректный идентификатор диалога</p>
      )}
    </AdminChatDialoguePageViewStyled>
  )
}
