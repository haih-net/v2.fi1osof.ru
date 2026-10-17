import type * as React from 'react'
import { Link, useLoaderData } from 'react-router'
import ReactMarkdown from 'react-markdown'
import { useConceptsConnectionQuery } from '../../../gql/generated'
import { CustomLayoutSectionStyled } from '../../Layout/styles'
import { Pagination } from '../../components/Pagination'
import { getResizedImagePath } from '../../helpers/getResizedImagePath'
import { getListVariables } from './queryVariables'
import type { createListLoader } from './loader.server'
import {
  ConceptListStyled,
  ConceptItemStyled,
  ConceptTitleStyled,
  ConceptDescriptionStyled,
  ConceptMetaStyled,
} from './styles'

export const ConceptsPage: React.FC = () => {
  const { page, kind, initialError } =
    useLoaderData<ReturnType<typeof createListLoader>>()
  const variables = getListVariables(kind, page)
  const { data, loading, error } = useConceptsConnectionQuery({ variables })
  return (
    <CustomLayoutSectionStyled>
      {error || (!data && initialError) ? (
        <p role="alert">
          Не удалось загрузить публикации. Попробуйте обновить страницу.
        </p>
      ) : loading && !data ? (
        <p role="status">Загружаем публикации…</p>
      ) : (
        <>
          <ConceptListStyled>
            {data?.concepts.map((concept) => (
              <ConceptItemStyled key={concept.id}>
                <Link to={concept.uri}>
                  <ConceptTitleStyled>
                    {concept.name || concept.id}
                  </ConceptTitleStyled>
                </Link>
                {kind === 'concepts' && concept.image && (
                  <img
                    src={getResizedImagePath({
                      path: concept.image,
                      size: 'middle',
                    })}
                    alt={concept.name}
                    loading="lazy"
                  />
                )}
                {concept.description && (
                  <ConceptDescriptionStyled>
                    <ReactMarkdown>{concept.description}</ReactMarkdown>
                  </ConceptDescriptionStyled>
                )}
                {kind !== 'concepts' && (
                  <ConceptMetaStyled>
                    <Link to={concept.uri}>
                      {new Intl.DateTimeFormat('ru-RU', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'Europe/Moscow',
                      }).format(new Date(concept.updatedAt))}
                    </Link>
                    {concept.CreatedBy && (
                      <Link to={`/users/${concept.CreatedBy.id}`}>
                        {concept.CreatedBy.fullname ||
                          concept.CreatedBy.username ||
                          concept.CreatedBy.id}
                      </Link>
                    )}
                  </ConceptMetaStyled>
                )}
              </ConceptItemStyled>
            ))}
          </ConceptListStyled>
          {!data?.concepts.length && <p>Публикаций пока нет.</p>}
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(
              (data?.kBConceptsCount ?? 0) / (variables.take ?? 12),
            )}
          />
        </>
      )}
    </CustomLayoutSectionStyled>
  )
}
