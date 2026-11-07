import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { ClientsHappyBaby2000Page } from '../Custom/pages/Clients/HappyBaby2000'
export const handle = {
  seo: {
    title: 'HappyBaby2000: развитие магазина и ИИ-помощника',
    description:
      'Новая витрина давнего интернет-магазина HappyBaby2000, поиск по каталогу и собственный ИИ-агент Николая Ланца.',
    path: '/clients/happybaby2000',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default ClientsHappyBaby2000Page
