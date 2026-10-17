import { Markdown } from 'app/Custom/components/Markdown'
import { useBoolean } from 'app/Custom/hooks/useBoolean'
import { ChatMessageFragment } from 'app/gql/generated'
import {
  ChatMessageStyled,
  ChatMessageToggleButtonStyled,
  ChatMessageToolbarStyled,
} from './styles'
import { ChatMessageRole } from './ChatMessageRole'

type ChatMessageProps = {
  message: ChatMessageFragment
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [opened, , , openedToggle] = useBoolean(
    message.role === 'user' || message.role === 'assistant' ? true : false,
  )

  return (
    <ChatMessageStyled
      data-role={message.role}
      data-success={
        typeof message.success === 'boolean'
          ? String(message.success)
          : 'unknown'
      }
    >
      <ChatMessageToolbarStyled>
        <div>
          <ChatMessageRole role={message.role} />
          <span title={message.id ?? ''}>{message.createdAt}</span>
          <span></span>
        </div>
        <div>
          <ChatMessageToggleButtonStyled
            type="button"
            onClick={openedToggle}
            aria-expanded={opened}
            aria-label={opened ? 'Свернуть сообщение' : 'Развернуть сообщение'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </ChatMessageToggleButtonStyled>
        </div>
      </ChatMessageToolbarStyled>

      {message.role === 'user' && message.pageUrl && (
        <p className="page-url">
          Страница:{' '}
          <a href={message.pageUrl} target="_blank" rel="noopener noreferrer">
            {message.pageUrl}
          </a>
        </p>
      )}
      {message.replyToId && (
        <p className="metadata">Ответ на: {message.replyToId}</p>
      )}
      {opened ? (
        <div className="content">
          {message.role === 'user' || message.role === 'assistant' ? (
            <Markdown>{message.content}</Markdown>
          ) : (
            message.content
          )}
        </div>
      ) : null}
    </ChatMessageStyled>
  )
}
