import React, { useRef, useLayoutEffect, useCallback } from 'react'
import {
  ChatContentContainer,
  ChatMessages,
  ChatInputContainer,
  WelcomeMessage,
  TypingIndicator,
} from '../styles'
import { ChatInputForm } from '../ChatInputForm'
import { useChatContext } from '../context'
import { ChatMessageMemo } from '../ChatMessage'

export const ChatContent: React.FC = () => {
  const { messages, welcomeTitle, welcomeText, showTypingIndicator } =
    useChatContext()
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrolledMessageIdsRef = useRef(new Set<string>())
  const scrollAnimationRef = useRef<number | null>(null)
  const cancelScrollAnimation = useCallback(() => {
    if (scrollAnimationRef.current !== null) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
    }
  }, [])

  useLayoutEffect(() => cancelScrollAnimation, [cancelScrollAnimation])

  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    const message = messages.at(-1)
    if (!container || !message) {
      return
    }
    const element = Array.from(container.children).find(
      (child) => child.getAttribute('data-message-id') === message.id,
    )
    if (!element) {
      return
    }

    const updateScroll = () => {
      const alreadyScrolled = scrolledMessageIdsRef.current.has(message.id)
      if (message.isUser) {
        cancelScrollAnimation()
        container.style.removeProperty('--chat-response-space')
        if (!alreadyScrolled) {
          container.scrollTop = container.scrollHeight
          scrolledMessageIdsRef.current.add(message.id)
        }
        return
      }

      const first = container.firstElementChild
      const last = container.lastElementChild
      if (!first || !last || container.clientHeight === 0) {
        return
      }
      const padding = Number.parseFloat(getComputedStyle(container).paddingTop)
      const firstRect = first.getBoundingClientRect()
      const lastRect = last.getBoundingClientRect()
      const messageRect = element.getBoundingClientRect()
      const contentHeight = lastRect.bottom - firstRect.top + padding * 2
      if (!alreadyScrolled && contentHeight <= container.clientHeight) {
        return
      }

      // Запас снизу позволяет поднять даже первый короткий чанк к верху.
      const space = Math.max(
        0,
        container.clientHeight -
          padding * 2 -
          (lastRect.bottom - messageRect.top),
      )
      container.style.setProperty('--chat-response-space', `${space}px`)
      if (!alreadyScrolled) {
        cancelScrollAnimation()
        const startTop = container.scrollTop
        const distance =
          element.getBoundingClientRect().top -
          container.getBoundingClientRect().top -
          container.clientTop -
          padding
        const startedAt = performance.now()
        const animate = (now: number) => {
          const progress = Math.min((now - startedAt) / 500, 1)
          const eased = progress * progress * (3 - 2 * progress)
          container.scrollTop = startTop + distance * eased
          scrollAnimationRef.current =
            progress < 1 ? requestAnimationFrame(animate) : null
        }
        scrolledMessageIdsRef.current.add(message.id)
        scrollAnimationRef.current = requestAnimationFrame(animate)
      }
    }

    updateScroll()
    const observer = new ResizeObserver(updateScroll)
    observer.observe(container)
    observer.observe(element)
    return () => observer.disconnect()
  }, [messages, showTypingIndicator, cancelScrollAnimation])

  const hasMessages = messages.length > 0

  return (
    <ChatContentContainer
      data-testid="chat-content"
      data-has-messages={hasMessages}
    >
      {hasMessages ? (
        <ChatMessages
          ref={messagesContainerRef}
          onWheel={cancelScrollAnimation}
          onTouchStart={cancelScrollAnimation}
          onPointerDown={cancelScrollAnimation}
          onKeyDown={cancelScrollAnimation}
        >
          {messages.map((msg) => (
            <ChatMessageMemo
              key={msg.id}
              id={msg.id}
              isUser={msg.isUser}
              text={msg.text}
            />
          ))}
          {showTypingIndicator && (
            <TypingIndicator>
              <span />
              <span />
              <span />
            </TypingIndicator>
          )}
        </ChatMessages>
      ) : (
        <WelcomeMessage>
          <h4>{welcomeTitle}</h4>
          <p>{welcomeText}</p>
        </WelcomeMessage>
      )}

      <ChatInputContainer data-testid="chat-footer">
        <ChatInputForm />
      </ChatInputContainer>
    </ChatContentContainer>
  )
}
