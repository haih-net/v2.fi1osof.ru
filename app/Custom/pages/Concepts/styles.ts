import { styled } from '@linaria/react'
export const ConceptListStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
`
export const ConceptItemStyled = styled.article`
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  img {
    max-width: 100%;
    align-self: flex-start;
    height: auto;
  }

  a {
    text-decoration: none;
  }
`
export const ConceptTitleStyled = styled.h2`
  text-overflow: ellipsis;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
`
export const ConceptDescriptionStyled = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  overflow-wrap: anywhere;
`
export const ConceptMetaStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0 0;
  font-size: 0.75rem;
  color: #6b7280;
`
