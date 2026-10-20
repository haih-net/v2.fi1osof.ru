import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import type { SeoHandle } from '../components/seo/SeoHeaders'
import { site } from '../components/seo/site'
import portrait from '../Custom/pages/MainPage/View/assets/portrait.webp'
import { MainPage } from 'app/Custom/pages/MainPage'

export const handle = {
  seo: {
    title: site.name,
    description: site.description,
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
