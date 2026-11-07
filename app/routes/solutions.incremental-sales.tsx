import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { SolutionsIncrementalSalesPage } from '../Custom/pages/Solutions/IncrementalSales'
export const handle = {
  seo: {
    title: 'Дополнительные продажи: помощь тем, кто уже на сайте',
    description:
      'Поиск, консультации и рекомендации для существующих посетителей сайта. Развитие качества сервиса без обещаний неизмеренного роста продаж.',
    path: '/solutions/incremental-sales',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default SolutionsIncrementalSalesPage
