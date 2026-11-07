import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { ClientsPage } from '../Custom/pages/Clients'
export const handle = {
  seo: {
    title: 'Клиенты, с которыми мы работаем годами',
    description:
      'Килфор, HappyBaby2000 и BallDecor: многолетнее сотрудничество и новый этап комплексного сопровождения сайтов.',
    path: '/clients',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default ClientsPage
