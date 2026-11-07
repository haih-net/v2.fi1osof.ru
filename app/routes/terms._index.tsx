import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { TermsPage } from '../Custom/pages/Terms'
export const handle = {
  seo: {
    title: 'Термины и технологии',
    description:
      'Технологии и провайдеры, которые используются в решениях Николая Ланца.',
    path: '/terms',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default TermsPage
