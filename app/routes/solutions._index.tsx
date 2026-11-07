import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { SolutionsPage } from '../Custom/pages/Solutions'
export const handle = {
  seo: {
    title: 'Решения для вашего сайта',
    description:
      'Возможности собственной платформы Николая Ланца: ИИ-продавец, развитие продаж, внутренние процессы и видимость компании в нейросетях.',
    path: '/solutions',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default SolutionsPage
