import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { TermsPolzaAiPage } from '../Custom/pages/Terms/PolzaAi'
export const handle = {
  seo: {
    title: 'Polza.ai: провайдер моделей для моих ИИ-агентов',
    description:
      'Почему Николай Ланец использует Polza.ai: модели через единый API, оплата в рублях, отдельные ключи с лимитами и российская инфраструктура.',
    path: '/terms/polza.ai',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default TermsPolzaAiPage
