import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChatWidget as Component } from './'
import { ChatInputForm } from './ChatInputForm'
import { ChatMessage } from './ChatMessage'
import { ChatContent } from './ChatContent'
import {
  withChatContext,
  type ChatStoryState,
} from '../../../../../.storybook/decorators/withChatContext'
import {
  mockChatMessages,
  mockStreamingMessages,
} from '../../../../../.storybook/mocks/chat'

const meta = {
  title: 'Components/ChatWidget',
  component: Component,
  decorators: [withChatContext],
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

export const Default: Story = {}

export const InputFormDefault: Story = {
  decorators: withFrame,
  render: () => <ChatInputForm />,
}

export const InputFormWithText: Story = {
  ...InputFormDefault,
  parameters: chatState({ initialMessage: 'Hello, how are you?' }),
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
      <div style={{ display: 'flex', width: 380, height: 400 }}>
        <Story />
      </div>
    ),
  ],
  parameters: chatState({ messages: mockChatMessages }),
  render: () => <ChatContent />,
}

export const ChatWindowDefault: Story = {
  parameters: chatState({ isOpen: true }),
}

export const ChatWindowWithMessages: Story = {
  parameters: chatState({
    isOpen: true,
    messages: mockChatMessages,
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
