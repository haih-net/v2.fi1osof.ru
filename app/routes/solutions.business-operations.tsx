import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { SolutionsBusinessOperationsPage } from '../Custom/pages/Solutions/BusinessOperations'
export const handle = {
  seo: {
    title: 'Сайт, на котором работает бизнес',
    description:
      'Личные кабинеты, пропуска и заявки: собственные системы Николая Ланца для ежедневных процессов бизнеса.',
    path: '/solutions/business-operations',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default SolutionsBusinessOperationsPage
