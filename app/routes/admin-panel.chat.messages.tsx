import type { MetaFunction } from 'react-router'
import { AdminChatMessagesPage } from 'app/Custom/pages/AdminChatMessages'

export const meta: MetaFunction = () => [
  { title: 'Сообщения чата' },
  { name: 'robots', content: 'noindex, nofollow' },
]
export default AdminChatMessagesPage
