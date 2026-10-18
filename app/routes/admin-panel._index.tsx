import type { MetaFunction } from 'react-router'
import { AdminPage } from 'app/Custom/pages/Admin'

export const meta: MetaFunction = () => [
  { title: 'Админка' },
  { name: 'robots', content: 'noindex, nofollow' },
]
export default AdminPage
