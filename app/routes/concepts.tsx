import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import { ConceptsPage } from 'app/Custom/pages/Concepts'
import { createListLoader } from 'app/Custom/pages/Concepts/loader.server'
export const loader = createListLoader('concepts')
export const meta: MetaFunction<typeof loader> = ({ loaderData, error }) =>
  error || !loaderData || loaderData.initialError
    ? unavailableSeoMeta()
    : createSeoMeta({
        title: `База знаний Николая Ланца${loaderData.page > 1 ? ` — страница ${loaderData.page}` : ''}`,
        description:
          'Заметки и материалы Николая Ланца о программировании, искусственном интеллекте, проектах и изучении новых технологий.',
        path: '/concepts',
        page: loaderData.page,
      })
export default ConceptsPage
