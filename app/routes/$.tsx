import type { MetaFunction } from 'react-router'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
import { ConceptPage } from 'app/Custom/pages/Concepts/Concept'
import { loadConcept } from 'app/Custom/pages/Concepts/Concept/loader.server'
export const loader = loadConcept
export const meta: MetaFunction<typeof loader> = ({
  loaderData: data,
  error,
}) => (error || !data ? unavailableSeoMeta() : createSeoMeta(data.seo))
export default ConceptPage
