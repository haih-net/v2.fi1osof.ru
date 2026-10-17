import type React from 'react'
import { useLoaderData } from 'react-router'
import { useConceptQuery } from 'app/gql/generated'
import { ConceptItem } from '../../../components/ConceptItem'
import { CustomLayoutSectionStyled } from '../../../Layout/styles'
import type { loadConcept } from './loader.server'

export const ConceptPage: React.FC = () => {
  const { uri } = useLoaderData<typeof loadConcept>()
  const { data, error, loading } = useConceptQuery({
    variables: { where: { uri } },
  })
  const concept = data?.concept
  if (!concept) {
    return (
      <CustomLayoutSectionStyled>
        <p role={error ? 'alert' : 'status'}>
          {loading ? 'Загружаем страницу…' : 'Не удалось загрузить страницу.'}
        </p>
      </CustomLayoutSectionStyled>
    )
  }
  return <ConceptItem concept={concept} variant="full" />
}
