import squareImage from './assets/chat-square.webp'
import wideImage from './assets/chat-wide.webp'
import type { ChatMessage as ChatMessageData } from './interfaces'
import React, { useEffect, useRef, useState } from 'react'
import { ChatContext, useChatContext } from './context'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChatWidget as Component } from './'
import { ChatInputForm } from './ChatInputForm'
import { ChatMessage } from './ChatMessage'
import { ChatContent } from './ChatContent'
import { type ChatStoryState } from '../../../../../.storybook/decorators/withChatContext'
import {
  mockChatMessages,
  mockChatMessagesLong,
  mockStreamingMessages,
} from '../../../../../.storybook/mocks/chat'

const meta = {
  title: 'Components/ChatWidget',
  component: Component,
} satisfies Meta<typeof Component>

export default meta

type Story = StoryObj<typeof meta>

const chatState = (state: ChatStoryState) => ({ chatContext: state })

const withFrame: NonNullable<Story['decorators']> = [
  (Story) => (
    <>
      <Story />
    </>
  ),
]

const messagesWithImages: ChatMessageData[] = mockChatMessagesLong.map(
  (message) =>
    message.isUser
      ? message
      : {
          ...message,
          text: `${message.text}

![Ceramic teapot beside a plant](${squareImage})

![Mountain lake panorama](${wideImage})`,
        },
)

const mockLongResponse: string = Array<string>(8)
  .fill(mockChatMessagesLong[1].text)
  .join('\n\n')

const StreamingConversation: React.FC<
  React.PropsWithChildren<{ initialMessages?: ChatMessageData[] }>
> = ({ children, initialMessages = mockChatMessagesLong }) => {
  const chat = useChatContext()
  const [messages, setMessages] = useState(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [showTypingIndicator, setShowTypingIndicator] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStreaming = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsLoading(false)
    setShowTypingIndicator(false)
  }

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current)
      }
    },
    [],
  )

  const submitMessage = async (text: string): Promise<void> => {
    if (!text.trim() || timerRef.current !== null) {
      return
    }
    const id = crypto.randomUUID()
    setMessages((previous) => [
      ...previous,
      { id: `user_${id}`, text: text.trim(), isUser: true },
    ])
    setIsLoading(true)
    setShowTypingIndicator(true)
    let offset = 0
    const startedAt = performance.now()
    timerRef.current = setInterval(() => {
      const firstChunk = offset === 0
      offset = Math.min(
        Math.ceil(
          ((performance.now() - startedAt) / 3000) * mockLongResponse.length,
        ),
        mockLongResponse.length,
      )
      const response = {
        id,
        text: mockLongResponse.slice(0, offset),
        isUser: false,
      }
      setShowTypingIndicator(false)
      setMessages((previous) =>
        firstChunk
          ? [...previous, response]
          : previous.map((message) => (message.id === id ? response : message)),
      )
      if (offset === mockLongResponse.length) {
        stopStreaming()
      }
    }, 40)
  }

  return (
    <ChatContext.Provider
      value={{
        ...chat,
        messages,
        isLoading,
        showTypingIndicator,
        submitMessage,
        stopStreaming,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const Default: Story = {}

export const InputFormDefault: Story = {
  decorators: withFrame,
  render: () => <ChatInputForm />,
}

export const InputFormWithText: Story = {
  ...InputFormDefault,
  parameters: chatState({ initialMessage: 'Hello, how are you?' }),
}

export const InputFormWithTextLong: Story = {
  ...InputFormDefault,
  parameters: chatState({
    initialMessage: `There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.`,
  }),
}

export const InputFormDisabled: Story = {
  ...InputFormDefault,
  parameters: chatState({ isLoading: true }),
}

export const InputFormStreaming: Story = {
  ...InputFormDefault,
  parameters: chatState({ isLoading: true, showTypingIndicator: true }),
}

export const MessageUser: Story = {
  decorators: withFrame,
  render: () => <ChatMessage {...mockChatMessages[0]} />,
}

export const MessageBot: Story = {
  decorators: withFrame,
  render: () => <ChatMessage {...mockChatMessages[1]} />,
}

export const MessageBotStreaming: Story = {
  decorators: withFrame,
  render: () => <ChatMessage {...mockStreamingMessages[1]} />,
}

export const MessageBotEmpty: Story = {
  decorators: withFrame,
  render: () => <ChatMessage id="empty-bot" isUser={false} text="" />,
}

export const ChatConversation: Story = {
  decorators: [
    (Story) => (
      <div
        style={{ display: 'flex', width: '100%', maxWidth: 380, height: 400 }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: chatState({ messages: mockChatMessages }),
  render: () => <ChatContent />,
}

export const ChatConversationLongText: Story = {
  decorators: [
    (Story) => (
      <div
        style={{ display: 'flex', width: '100%', maxWidth: 380, height: 400 }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: chatState({ messages: mockChatMessagesLong }),
  render: () => (
    <StreamingConversation>
      <ChatContent />
    </StreamingConversation>
  ),
}

export const ChatWindowDefault: Story = {
  parameters: chatState({ isOpen: true }),
}

export const ChatWindowWithMessages: Story = {
  render: () => (
    <StreamingConversation initialMessages={messagesWithImages}>
      <Component />
    </StreamingConversation>
  ),
  parameters: chatState({
    isOpen: true,
    messages: messagesWithImages,
  }),
}

export const ChatWindowStreaming: Story = {
  parameters: chatState({
    isOpen: true,
    messages: mockStreamingMessages,
    isLoading: true,
    showTypingIndicator: true,
  }),
}
