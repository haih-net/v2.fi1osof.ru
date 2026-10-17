import type React from 'react'
import { Link } from 'react-router'
import { CalendarDays, MessagesSquare, CircleAlert } from 'lucide-react'
import {
  useChatMessagesQuery,
  type ChatDialoguesQuery,
} from 'app/gql/generated'

type DialogueCardProps = {
  dialogue: ChatDialoguesQuery['chatDialogues'][number]
}

export const DialogueCard: React.FC<DialogueCardProps> = ({ dialogue }) => {
  const { data, loading, error } = useChatMessagesQuery({
    variables: { chatId: dialogue.chatId },
    fetchPolicy: 'network-only',
  })
  const firstMessage = data?.chatMessages[0]
  const errorCount =
    data?.chatMessages.filter((message) => message.success === false).length ??
    0
  return (
    <article>
      <div className="dialogue-toolbar">
        <Link
          to={`/admin/chat/dialogues/${dialogue.chatId}`}
          title={`Открыть диалог: ${dialogue.chatId}`}
          aria-label={`Открыть диалог: ${dialogue.chatId}`}
        >
          <CalendarDays size={18} aria-hidden="true" />
          <time dateTime={dialogue.createdAt}>{dialogue.createdAt}</time>
        </Link>
        {!loading && !error && data && (
          <>
            <span
              title="Количество сообщений"
              aria-label={`Сообщений: ${data.chatMessages.length}`}
            >
              <MessagesSquare size={18} aria-hidden="true" />
              {data.chatMessages.length}
            </span>
            {errorCount > 0 && (
              <span
                className="error-count"
                title="Количество ошибок"
                aria-label={`Ошибок: ${errorCount}`}
              >
                <CircleAlert size={18} aria-hidden="true" />
                {errorCount}
              </span>
            )}
          </>
        )}
      </div>
      {loading ? (
        <p role="status">Загрузка первого сообщения…</p>
      ) : error ? (
        <p role="alert">Не удалось загрузить сообщения</p>
      ) : firstMessage ? (
        <p className="content">{firstMessage.content}</p>
      ) : (
        <p>Сообщений пока нет</p>
      )}
    </article>
  )
}
