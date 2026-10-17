import React, { useCallback, useRef, useState } from 'react'

import {
  FileUploaderStyled,
  DropZoneStyled,
  PreviewStyled,
  RemoveButtonStyled,
  ErrorMessageStyled,
  LoadingOverlayStyled,
  GeneratorActionsStyled,
} from './styles'
import { Button } from 'app/Custom/components/Button'
import { ImageGenerator } from './Generator'
import {
  FileFragment,
  useLlmImageGenerationMutation,
  useSingleUploadMutation,
} from 'app/gql/generated'

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export interface FileUploaderProps {
  value?: string | null
  onChange?: (file: FileFragment | null) => void
  directory?: string
  disabled?: boolean
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  value,
  onChange,
  directory,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [uploadFile, { loading }] = useSingleUploadMutation()

  const [generateImage, { loading: generating }] =
    useLlmImageGenerationMutation()

  const [prompt, setPrompt] = useState('')
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Allowed types: JPEG, PNG, GIF, WebP')
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`Max size — ${MAX_FILE_SIZE}MB`)
        return
      }

      const localPreview = URL.createObjectURL(file)
      setPreview(localPreview)

      try {
        const result = await uploadFile({
          variables: {
            data: {
              file,
              directory,
            },
          },
        })

        if (result.data?.singleUpload) {
          onChange?.(result.data.singleUpload)
        } else {
          setError('Unhandled error')
          setPreview(value || null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unhandled error')
        setPreview(value || null)
      }
    },
    [uploadFile, directory, onChange, value],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || loading) {
        return
      }

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile, disabled, loading],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!disabled && !loading) {
      inputRef.current?.click()
    }
  }, [disabled, loading])

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setPreview(null)
      setError(null)
      setGeneratedBase64(null)
      onChange?.(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [onChange],
  )

  const handleSaveGenerated = useCallback(async () => {
    if (!generatedBase64) {
      return
    }

    try {
      const response = await fetch(generatedBase64)
      const blob = await response.blob()
      const file = new File([blob], 'generated-image.png', {
        type: 'image/png',
      })

      const result = await uploadFile({
        variables: {
          data: {
            file,
            directory,
          },
        },
      })

      if (result.data?.singleUpload) {
        setPreview(generatedBase64)
        setGeneratedBase64(null)
        setPrompt('')
        onChange?.(result.data.singleUpload)
      } else {
        setError('Save error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save error')
    }
  }, [generatedBase64, uploadFile, directory, onChange])

  const handleCancelGenerated = useCallback(() => {
    setGeneratedBase64(null)
  }, [])

  const isLoading = loading || generating

  return (
    <FileUploaderStyled>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={handleInputChange}
        disabled={disabled || isLoading}
        style={{ display: 'none' }}
      />

      {generatedBase64 ? (
        <DropZoneStyled data-haspreview="true" data-disabled={isLoading}>
          {isLoading && (
            <LoadingOverlayStyled>
              <span>Saving...</span>
            </LoadingOverlayStyled>
          )}
          <PreviewStyled>
            <img src={generatedBase64} alt="Generated preview" />
          </PreviewStyled>
          <GeneratorActionsStyled>
            <Button onClick={handleSaveGenerated} disabled={isLoading}>
              Save
            </Button>
            <Button onClick={handleCancelGenerated} disabled={isLoading}>
              Cancel
            </Button>
          </GeneratorActionsStyled>
        </DropZoneStyled>
      ) : (
        <DropZoneStyled
          data-isdragging={isDragging}
          data-haspreview={!!preview}
          data-disabled={disabled || isLoading}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isLoading && (
            <LoadingOverlayStyled>
              <span>Uploading...</span>
            </LoadingOverlayStyled>
          )}

          {preview ? (
            <PreviewStyled>
              <img src={preview} alt="Preview" />
              {!disabled && !isLoading && (
                <RemoveButtonStyled onClick={handleRemove}>
                  ×
                </RemoveButtonStyled>
              )}
            </PreviewStyled>
          ) : (
            <span>
              {isDragging
                ? 'Drop file'
                : 'Drop image here or click to select file'}
            </span>
          )}
        </DropZoneStyled>
      )}

      <ImageGenerator
        disabled={disabled}
        generateImage={generateImage}
        generating={generating}
        prompt={prompt}
        setGeneratedBase64={setGeneratedBase64}
        setPrompt={setPrompt}
      />

      {error && <ErrorMessageStyled>{error}</ErrorMessageStyled>}
    </FileUploaderStyled>
  )
}
