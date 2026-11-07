import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { SolutionsAiVisibilityPage } from '../Custom/pages/Solutions/AiVisibility'
export const handle = {
  seo: {
    title: 'Информационный контур компании в генеративном поиске',
    description:
      'Как помочь нейросетям понимать компанию: достоверные материалы, связи между источниками и проверка ответов генеративного поиска.',
    path: '/solutions/ai-visibility',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default SolutionsAiVisibilityPage
