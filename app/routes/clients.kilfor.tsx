import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { ClientsKilforPage } from '../Custom/pages/Clients/Kilfor'
export const handle = {
  seo: {
    title: 'Килфор: сайт и рабочие системы бизнес-центра',
    description:
      'Сотрудничество Николая Ланца с бизнес-центром «Килфор» с 2016 года: пропуска, диспетчерская и развитие сайта.',
    path: '/clients/kilfor',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default ClientsKilforPage
