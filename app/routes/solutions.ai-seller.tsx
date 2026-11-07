import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { SolutionsAiSellerPage } from '../Custom/pages/Solutions/AiSeller'
export const handle = {
  seo: {
    title: 'ИИ-продавец и консультант сайта',
    description:
      'Собственный ИИ-агент Николая Ланца: поиск товаров, помощь с выбором и инструменты сайта. В рамках постоянного сопровождения, без отдельной платы за публичного агента.',
    path: '/solutions/ai-seller',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default SolutionsAiSellerPage
