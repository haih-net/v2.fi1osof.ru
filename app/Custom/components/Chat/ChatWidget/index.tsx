import React, { lazy, Suspense } from 'react'
import { ChatWidgetContainer, ChatButton } from './styles'
import { useChatContext } from './context'
const ChatContent = lazy(() =>
  import('./ChatContent').then((module) => ({ default: module.ChatContent })),
)

const ChatModal = lazy(() =>
  import('./ChatModal').then((module) => ({ default: module.ChatModal })),
)

export const ChatWidget: React.FC = () => {
  const chat = useChatContext()

  return (
    <ChatWidgetContainer>
      {chat.isOpen && (
        <Suspense fallback={null}>
          <ChatModal
            isExpanded={chat.isExpanded}
            onClose={chat.handleClose}
            onExpand={chat.handleExpand}
          >
            <ChatContent />
          </ChatModal>
        </Suspense>
      )}

      <ChatButton
        aria-label="Открыть ИИ-помощника"
        onClick={chat.handleToggle}
        data-open={chat.isOpen}
        type="button"
      >
        <svg viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </ChatButton>
    </ChatWidgetContainer>
  )
}
