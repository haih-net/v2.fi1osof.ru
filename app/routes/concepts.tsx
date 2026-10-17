import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import { ConceptsPage } from 'app/Custom/pages/Concepts'
import { createListLoader } from 'app/Custom/pages/Concepts/loader.server'
export const loader = createListLoader('concepts')
export const meta: MetaFunction = ({ error }) =>
  error
    ? unavailableSeoMeta()
    : createSeoMeta({
        title: 'База знаний',
        description: '',
        path: '/concepts',
      })
export default ConceptsPage
