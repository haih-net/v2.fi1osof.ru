import {
  data,
  type ClientLoaderFunctionArgs,
  type MetaFunction,
  type HeadersFunction,
} from 'react-router'
import { initializeApollo } from '../gql/apolloClient'
import { loadPage, type PageData } from '../Custom/pages/Site/data'
import { loader as loadServerPage } from '../Custom/pages/Site/loader.server'
export { SitePage as default } from '../Custom/pages/Site'
export const headers: HeadersFunction = () => ({ 'Cache-Control': 'no-store' })
export const loader = async (args: Parameters<typeof loadServerPage>[0]) =>
  data(await loadServerPage(args), { headers: { 'Cache-Control': 'no-store' } })
export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  return loadPage(initializeApollo({ withWs: false }), new URL(request.url))
}
export const meta: MetaFunction = ({ loaderData: value, error, location }) => {
  const page = value as PageData | undefined
  if (error || !page) {
    return [{ title: '404 — Fi1osof' }, { name: 'robots', content: 'noindex' }]
  }
  const canonical = `https://fi1osof.ru${location.pathname}${page.page > 1 ? `?page=${page.page}` : ''}`
  return [
    { title: page.title },
    { name: 'description', content: page.description || page.title },
    { tagName: 'link', rel: 'canonical', href: canonical },
    { property: 'og:title', content: page.title },
    { property: 'og:description', content: page.description || page.title },
    { property: 'og:type', content: 'website' },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        url: canonical,
        name: page.title,
        inLanguage: page.locale,
      },
    },
    { property: 'og:url', content: canonical },
  ]
}
