import type { MetaFunction } from 'react-router'
import { ProfilePage } from 'app/Custom/pages/Users/Profile'
import { createSeoMeta } from '../components/seo/SeoHeaders'

export const meta: MetaFunction = () =>
  createSeoMeta({
    title: 'Мой профиль',
    description: '',
    path: '/panel/profile',
    noindex: true,
  })

export default ProfilePage
