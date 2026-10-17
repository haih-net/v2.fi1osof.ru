import { redirect, type LoaderFunctionArgs } from 'react-router'

export function loader({ request, params }: LoaderFunctionArgs): Response {
  const suffix = params['*']
  const path = suffix
    ? `/worklogs/${suffix.split('/').map(encodeURIComponent).join('/')}`
    : '/worklogs'
  return redirect(path + new URL(request.url).search, 301)
}
