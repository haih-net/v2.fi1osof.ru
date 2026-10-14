import { styled } from '@linaria/react'
import { markdownStyles } from '../styles'

export const MarkdownEditorStyled = styled.div`
  ${markdownStyles}

  max-height: 80dvh;
  overflow: auto;

  .content {
    border-bottom: 1px solid #ddd;
    min-height: 100px;
  }
`

export const MarkdownEditorGlobalStyled = `
  body {
    .mdxeditor-popup-container {
      z-index: 2000;
    }
  }
`
