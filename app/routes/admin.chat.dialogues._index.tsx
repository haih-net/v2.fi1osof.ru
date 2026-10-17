import type { MetaFunction } from 'react-router'
import { AdminChatDialoguesPage } from 'app/Custom/pages/AdminChatDialogues'

export const meta: MetaFunction = () => [
  { title: 'Диалоги чата' },
  { name: 'robots', content: 'noindex, nofollow' },
]
export default AdminChatDialoguesPage
