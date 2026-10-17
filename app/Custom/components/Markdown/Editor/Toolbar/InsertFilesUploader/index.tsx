import React, { useCallback } from 'react'
import { usePublisher } from '@mdxeditor/gurx'
import { insertMarkdown$ } from '@mdxeditor/editor'
import { InsertFilesUploaderButtonStyled } from './styles'

export const InsertFilesUploader: React.FC = () => {
  const insertMarkdown = usePublisher(insertMarkdown$)

  const handleClick = useCallback(() => {
    insertMarkdown('<files-uploader></files-uploader>')
  }, [insertMarkdown])

  return (
    <InsertFilesUploaderButtonStyled
      type="button"
      onClick={handleClick}
      title="Upload files"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="6" width="14" height="14" rx="2" />
        <path d="M4 16V6a2 2 0 0 1 2-2h10" />
        <path d="M17 13l-3-3-4 4" />
        <circle cx="11" cy="10" r="1" />
      </svg>
    </InsertFilesUploaderButtonStyled>
  )
}
