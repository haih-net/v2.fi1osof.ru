import { data, type LoaderFunctionArgs } from 'react-router'
import { getInitialProps } from '../../components/pages/_App/getInitialProps.server'
import { loadPage } from '../Site/data'

export async function loadProjects({
  request,
  context,
  params,
}: LoaderFunctionArgs) {
  const url = new URL(request.url)
  url.pathname = params.projectId
    ? `/projects/${encodeURIComponent(params.projectId)}`
    : '/projects'
  const page = await getInitialProps(context, (client) =>
    loadPage(client, url, 'network-only'),
  )
  return data(page, { headers: { 'Cache-Control': 'no-store' } })
}
