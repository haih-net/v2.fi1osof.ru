import type { MetaFunction } from 'react-router'
import { SignInPage } from 'app/Custom/pages/SignIn'

export const meta: MetaFunction = () => [
  { title: 'Вход' },
  { name: 'robots', content: 'noindex, nofollow' },
]

export default SignInPage
