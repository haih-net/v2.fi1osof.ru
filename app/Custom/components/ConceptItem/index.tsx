import type React from 'react'
import { Link } from 'react-router'
import type { KbConceptFragment } from 'app/gql/generated'
import { CustomLayoutSectionStyled } from '../../Layout/styles'
import { Markdown } from '../Markdown'
import { ConceptGallery } from '../Gallery'
import {
  ConceptPageStyled,
  ConceptHeadingStyled,
  ConceptContentStyled,
} from './styles'

export const ConceptItem: React.FC<{
  concept: KbConceptFragment
  variant: 'full' | 'short'
}> = ({ concept, variant }) => {
  return variant === 'short' ? (
    <Link to={concept.uri}>{concept.name}</Link>
  ) : (
    <ConceptPageStyled>
      <ConceptHeadingStyled>
        <h1>{concept.name}</h1>
      </ConceptHeadingStyled>
      <CustomLayoutSectionStyled>
        <ConceptGallery key={concept.id} concept={concept} />
        {concept.description && <Markdown>{concept.description}</Markdown>}
        {concept.content && (
          <ConceptContentStyled aria-label="Содержание">
            <Markdown>{concept.content}</Markdown>
          </ConceptContentStyled>
        )}
      </CustomLayoutSectionStyled>
    </ConceptPageStyled>
  )
}
