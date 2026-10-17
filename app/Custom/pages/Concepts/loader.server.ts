import type { TypedDocumentNode } from '@apollo/client'
import { data, type LoaderFunctionArgs } from 'react-router'
import {
  ConceptsConnectionDocument,
  type ConceptsConnectionQuery,
  type ConceptsConnectionQueryVariables,
} from '../../../gql/generated'
import { getInitialProps } from '../../components/pages/_App/getInitialProps.server'
import { getListVariables, type ConceptListKind } from './queryVariables'

export function createListLoader(kind: ConceptListKind) {
  return async function loadConceptList({
    request,
    context,
  }: LoaderFunctionArgs) {
    const pageParam = new URL(request.url).searchParams.get('page')
    const parsedPage = pageParam === null ? 1 : Number.parseInt(pageParam, 10)
    const page = parsedPage > 0 ? parsedPage : 1
    const variables = getListVariables(kind, page)
    if (
      !Number.isSafeInteger(variables.skip) ||
      (variables.skip ?? 0) > 2_147_483_647
    ) {
      throw new Response('Страница не найдена', { status: 404 })
    }
    const props = await getInitialProps(context, async (client) => {
      try {
        const result = await client.query({
          query: ConceptsConnectionDocument as unknown as TypedDocumentNode<
            ConceptsConnectionQuery,
            ConceptsConnectionQueryVariables
          >,
          variables,
        })
        return {
          page,
          kind,
          initialError: false,
          notFound: !result.data?.concepts.length && page > 1,
        }
      } catch (error) {
        console.error('Failed to load concept list', error)
        return { page, kind, initialError: true, notFound: false }
      }
    })
    if (props.notFound) {
      throw new Response('Страница не найдена', { status: 404 })
    }
    return data(props, { status: props.initialError ? 503 : 200 })
  }
}
