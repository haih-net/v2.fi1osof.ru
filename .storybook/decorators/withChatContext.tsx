import type { Decorator } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router'
import {
  ChatContext,
  ChatProvider,
  useChatContext,
  type ChatContextValue,
} from '../../app/Custom/components/Chat/ChatWidget/context'
import type * as React from 'react'

export type ChatStoryState = Partial<ChatContextValue>
const StoryState: React.FC<
  React.PropsWithChildren<{ state: ChatStoryState }>
> = ({ state, children }) => {
  const chat = useChatContext()
  return (
    <ChatContext.Provider value={{ ...chat, ...state }}>
      {children}
    </ChatContext.Provider>
  )
}
export const withChatContext: Decorator = (Story, context) => (
  <MemoryRouter>
    <ChatProvider>
      <StoryState state={context.parameters.chatContext ?? {}}>
        <Story />
      </StoryState>
    </ChatProvider>
  </MemoryRouter>
)
