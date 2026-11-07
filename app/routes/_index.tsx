import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import portrait from '../Custom/pages/MainPage/View/assets/portrait.webp'
import { MainPage } from 'app/Custom/pages/MainPage'

export const handle = {
  seo: {
    title: 'Николай Ланец — постоянная поддержка и развитие сайтов',
    description:
      'Интерпрайз уровень услуг по цене фриланса. Николай Ланец: поддержка и развитие сайта от 30 000 ₽ в месяц, собственные ИИ-решения и многолетнее сотрудничество. Заботу о сайте беру на себя.',
    path: '/',
    image: {
      src: portrait,
      alt: 'Николай Ланец — Fi1osof',
      width: 317,
      height: 350,
    },
  },
} satisfies SeoHandle

export const meta: MetaFunction = ({ error }) =>
  error ? unavailableSeoMeta() : createSeoMeta(handle.seo)
export default MainPage
