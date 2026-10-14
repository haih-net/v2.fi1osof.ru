import React from 'react'
import { MarkdownFilesListStyled } from './styles'

export const MarkdownFilesList: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return <MarkdownFilesListStyled>{children}</MarkdownFilesListStyled>
}
