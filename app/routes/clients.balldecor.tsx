import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { ClientsBallDecorPage } from '../Custom/pages/Clients/BallDecor'
export const handle = {
  seo: {
    title: 'BallDecor: новый этап развития давнего сайта',
    description:
      'Многолетнее сотрудничество с BallDecor: обновление сайта воздушных шаров и оформления мероприятий в рамках постоянного сопровождения.',
    path: '/clients/balldecor',
  },
} satisfies SeoHandle
export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default ClientsBallDecorPage
