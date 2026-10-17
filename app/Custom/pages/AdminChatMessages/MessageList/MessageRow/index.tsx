import { useChatMessageQuery } from 'app/gql/generated'
import { Entry } from '../../interfaces'
import { roleLabel } from '../../helpers/roleLabel'
import { Link } from 'react-router'
import { Markdown } from 'app/Custom/components/Markdown'

type MessageRowProps = { entry: Entry }

export const MessageRow: React.FC<MessageRowProps> = ({ entry }) => {
  const { data, loading, error } = useChatMessageQuery({
    variables: { chatId: entry.chatId, messageId: entry.id },
    fetchPolicy: 'network-only',
  })
  return (
    <article className="message-card">
      <header className="message-meta">
        <span>
          <time dateTime={entry.createdAt}>{entry.createdAt}</time>
        </span>
        <span>{roleLabel(entry.role)}</span>
        <span
          data-success={
            typeof entry.success === 'boolean'
              ? String(entry.success)
              : 'unknown'
          }
        >
          {entry.success === true
            ? 'Успешно'
            : entry.success === false
              ? 'Ошибка'
              : 'Не записан'}
        </span>
        <span>
          <code>{entry.id}</code>
        </span>
        <span>
          <Link
            to={`/admin/chat/dialogues/${encodeURIComponent(entry.chatId)}`}
          >
            Открыть диалог
          </Link>
        </span>
        {entry.role === 'user' && entry.pageUrl && (
          <span>
            Страница:{' '}
            <a href={entry.pageUrl} target="_blank" rel="noopener noreferrer">
              {entry.pageUrl}
            </a>
          </span>
        )}
      </header>
      <div className="message-usage">
        {entry.usage ? (
          <>
            <span>
              Входные токены:{' '}
              {entry.usage.inputTokens?.toLocaleString('ru-RU') ?? 'нет данных'}
            </span>
            <span>
              Из них кешированные:{' '}
              {entry.usage.cachedTokens?.toLocaleString('ru-RU') ??
                'нет данных'}
            </span>
            <span>
              Выходные токены:{' '}
              {entry.usage.outputTokens?.toLocaleString('ru-RU') ??
                'нет данных'}
            </span>
          </>
        ) : (
          <span>Статистика токенов: нет данных</span>
        )}
      </div>
      <div className="content">
        {loading
          ? 'Загрузка…'
          : error
            ? 'Не удалось загрузить сообщение'
            : data?.chatMessage?.content && (
                <Markdown>{data?.chatMessage?.content}</Markdown>
              )}
      </div>
    </article>
  )
}
