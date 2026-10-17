import { useChatMessagesQuery } from 'app/gql/generated'
import { ChatMessage } from './ChatMessage'

export const Dialogue: React.FC<{ chatId: string }> = ({ chatId }) => {
  const { data, loading, error } = useChatMessagesQuery({
    variables: { chatId },
    fetchPolicy: 'network-only',
  })
  return (
    <>
      <code>{chatId}</code>
      {loading && <p role="status">Загрузка диалога…</p>}
      {error && <p role="alert">Не удалось загрузить диалог</p>}
      {data?.chatMessages.length === 0 && <p>В диалоге пока нет сообщений</p>}
      {data?.chatMessages.map((message, index) => (
        <ChatMessage key={message.id ?? `legacy-${index}`} message={message} />
      ))}
    </>
  )
}
