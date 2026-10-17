import type { TypedDocumentNode } from '@apollo/client'
import { data, type LoaderFunctionArgs } from 'react-router'
import {
  ConceptDocument,
  type ConceptQuery,
  type ConceptQueryVariables,
} from '../../../../gql/generated'
import { getInitialProps } from '../../../components/pages/_App/getInitialProps.server'

export async function loadConcept({ params, context }: LoaderFunctionArgs) {
  const uri = `/${params['*'] ?? ''}`
  const props = await getInitialProps(context, async (client) => {
    let result
    try {
      result = await client.query({
        query: ConceptDocument as unknown as TypedDocumentNode<
          ConceptQuery,
          ConceptQueryVariables
        >,
        variables: { where: { uri } },
      })
    } catch (error) {
      console.error('Failed to load concept', error)
      throw new Response('Не удалось загрузить страницу', { status: 503 })
    }
    const concept = result.data?.concept
    if (!concept) {
      throw new Response('Страница не найдена', { status: 404 })
    }
    const initialError = false

    return {
      uri,
      initialError,
      seo: {
        title: concept.name,
        description: concept.description ?? '',
        path: concept.uri,
      },
    }
  })
  return data(props, { status: props.initialError ? 503 : 200 })
}
