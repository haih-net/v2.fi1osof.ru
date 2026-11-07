import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { PricesPage } from '../Custom/pages/Prices'

export const handle = {
  seo: {
    title: 'Цены — постоянное сотрудничество',
    description:
      'Постоянное сотрудничество от 30 000 рублей в месяц. Собственные исследования и разработки, личная работа с каждым проектом. Стоимость определяется индивидуально.',
    path: '/prices',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default PricesPage
