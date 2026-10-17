import type { ChatMessage } from '../../app/Custom/components/Chat/ChatWidget/interfaces'

export const mockChatMessages: ChatMessage[] = [
  { id: 'user', text: 'Что взять с собой в баню?', isUser: true },
  {
    id: 'assistant',
    text: 'Возьмите полотенце, тапочки и банную шапку.',
    isUser: false,
  },
]
export const mockStreamingMessages: ChatMessage[] = [
  mockChatMessages[0],
  { id: 'assistant', text: 'Возьмите полотенце', isUser: false },
]
