import React, { useCallback, useState } from 'react'
import { insertImage$, readOnly$ } from '@mdxeditor/editor'
import { Modal } from 'app/Custom/components/Modal'
import { FileUploader } from 'app/Custom/components/FileUploader'
import { useCellValue, usePublisher } from '@mdxeditor/gurx'
import { iconComponentFor$ } from '@mdxeditor/editor'
import { InsertGeneratedImageButtonStyled } from './styles'
import { FileFragment } from 'app/gql/generated'

export const InsertGeneratedImage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const insertImage = usePublisher(insertImage$)
  const iconComponentFor = useCellValue(iconComponentFor$)
  const readOnly = useCellValue(readOnly$)

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleImageSelect = useCallback(
    (file: FileFragment | null) => {
      if (file?.path) {
        insertImage({
          src: `/images/resized/middle/${file.path}`,
          altText: '',
        })
        setIsOpen(false)
      }
    },
    [insertImage],
  )

  if (readOnly) {
    return null
  }

  return (
    <>
      <InsertGeneratedImageButtonStyled
        type="button"
        onClick={handleOpen}
        title="Generate image"
      >
        {iconComponentFor('add_photo')}
      </InsertGeneratedImageButtonStyled>

      <Modal isOpen={isOpen} onClose={handleClose} title="Add image">
        <FileUploader onChange={handleImageSelect} />
      </Modal>
    </>
  )
}
