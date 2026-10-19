import type { MetaFunction } from 'react-router'
import { SignUpPage } from 'app/Custom/pages/SignUp'
export const meta: MetaFunction = () => [
  { title: 'Регистрация' },
  { name: 'robots', content: 'noindex, nofollow' },
]
export default SignUpPage
