export { headers } from './site'
import type { MetaFunction } from 'react-router'
import { UsersPage } from 'app/Custom/pages/Users'
import { usersPageGetInitialProps } from 'app/Custom/pages/Users/usersPageGetInitialProps'
import { createSeoMeta, unavailableSeoMeta } from '../components/seo/SeoHeaders'
export const loader = usersPageGetInitialProps
export const meta: MetaFunction<typeof loader> = ({
  loaderData: data,
  error,
}) =>
  error
    ? unavailableSeoMeta()
    : createSeoMeta({
        title: 'Пользователи',
        description: '',
        noindex: true,
        path: `/users${data && data.page > 1 ? `?page=${data.page}` : ''}`,
      })
export default UsersPage
