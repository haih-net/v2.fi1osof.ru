import type { MetaFunction } from 'react-router'
import { AdminErrorsPage } from 'app/Custom/pages/AdminErrors'

export const meta: MetaFunction = () => [
  { title: 'Page errors' },
  { name: 'robots', content: 'noindex, nofollow' },
]
export { AdminErrorsPage as default }
