import React, { useCallback, useEffect, useRef } from 'react'
import { JsxEditorProps, useMdastNodeUpdater } from '@mdxeditor/editor'
import { MdxJsxFlowElement } from 'mdast-util-mdx'
import {
  FilesUploaderEditorStyled,
  DropZoneStyled,
  FileListStyled,
  FileItemStyled,
  FileInfoStyled,
  FileNameStyled,
  ProgressBarStyled,
  ProgressFillStyled,
  FileStatusStyled,
  RemoveButtonStyled,
} from './styles'
import {
  FileUploadItem,
  useFilesUploader,
} from 'app/Custom/hooks/useFilesUploader'

type FilesUploaderMdastNode = MdxJsxFlowElement & {
  name: 'files-uploader'
}

function extractFiles(children: FilesUploaderMdastNode['children']) {
  const result: Array<{ id: string; name: string }> = []

  const extract = (nodeAny: Record<string, unknown>) => {
    if (
      (nodeAny.type === 'mdxJsxFlowElement' ||
        nodeAny.type === 'mdxJsxTextElement') &&
      nodeAny.name === 'file'
    ) {
      const attrs = nodeAny.attributes as Array<{
        name: string
        value: unknown
      }>
      const id = String(attrs?.find((a) => a.name === 'data-id')?.value || '')
      const nodeChildren = nodeAny.children as Array<{ value?: string }>
      const name = nodeChildren?.[0]?.value || ''
      if (id) {
        result.push({ id, name })
      }
    }
  }

  const traverse = (nodeAny: Record<string, unknown>) => {
    extract(nodeAny)
    if (nodeAny.children) {
      for (const inner of nodeAny.children as Array<Record<string, unknown>>) {
        traverse(inner)
      }
    }
  }

  for (const child of children || []) {
    traverse(child as unknown as Record<string, unknown>)
  }

  return result
}

export const FilesUploaderEditor: React.FC<JsxEditorProps> = ({
  mdastNode,
}) => {
  const node = mdastNode as FilesUploaderMdastNode
  const updateMdastNode = useMdastNodeUpdater<FilesUploaderMdastNode>()

  const existingFiles = React.useMemo(
    () => extractFiles(node.children),
    [node.children],
  )

  const pendingFilesRef = useRef<Array<{ id: string; name: string }>>([])

  const handleUploadComplete = useCallback((file: FileUploadItem) => {
    if (file.result?.id) {
      pendingFilesRef.current.push({
        id: file.result.id,
        name: file.name,
      })
    }
  }, [])

  const handleRemoveFile = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const indexToRemove = Number(event.currentTarget.value)
      const newChildren = (node.children || []).filter(
        (_, i) => i !== indexToRemove,
      )
      updateMdastNode({ children: newChildren })
    },
    [node.children, updateMdastNode],
  )

  const { input, files, isDragging, getRootProps } = useFilesUploader({
    multiple: true,
    onUploadComplete: handleUploadComplete,
  })

  const isUploading = files.some(
    (f) => f.status === 'uploading' || f.status === 'pending',
  )

  const nodeRef = useRef(node)
  nodeRef.current = node

  useEffect(() => {
    if (!isUploading && pendingFilesRef.current.length > 0) {
      const newFileNodes = pendingFilesRef.current.map((file) => ({
        type: 'mdxJsxTextElement' as const,
        name: 'file',
        attributes: [
          {
            type: 'mdxJsxAttribute' as const,
            name: 'data-id',
            value: file.id,
          },
        ],
        children: [
          {
            type: 'text' as const,
            value: file.name,
          },
        ],
      }))

      pendingFilesRef.current = []

      updateMdastNode({
        children: [
          ...(nodeRef.current.children || []),
          ...newFileNodes,
        ] as typeof node.children,
      })
    }
  }, [isUploading, node, updateMdastNode])

  return (
    <FilesUploaderEditorStyled>
      {input}

      <DropZoneStyled {...getRootProps()} data-isdragging={isDragging}>
        {isDragging
          ? 'Drop files to upload'
          : 'Drag files here or click to select'}
      </DropZoneStyled>

      {(existingFiles.length > 0 ||
        files.some((f) => f.status !== 'success')) && (
        <FileListStyled>
          {existingFiles.map((file, index) => (
            <FileItemStyled key={`existing-${file.id}`}>
              <FileInfoStyled>
                <FileNameStyled>{file.name}</FileNameStyled>
              </FileInfoStyled>
              <FileStatusStyled $status="success">✓</FileStatusStyled>
              <RemoveButtonStyled
                title="Remove"
                type="button"
                value={index}
                onClick={handleRemoveFile}
              >
                ✕
              </RemoveButtonStyled>
            </FileItemStyled>
          ))}

          {files
            .filter((file) => file.status !== 'success')
            .map((file) => (
              <FileItemStyled key={file.id}>
                <FileInfoStyled>
                  <FileNameStyled>{file.name}</FileNameStyled>
                </FileInfoStyled>

                {file.status === 'uploading' && (
                  <ProgressBarStyled>
                    <ProgressFillStyled $progress={file.progress} />
                  </ProgressBarStyled>
                )}

                {file.status === 'error' && (
                  <FileStatusStyled $status="error">✗</FileStatusStyled>
                )}
              </FileItemStyled>
            ))}
        </FileListStyled>
      )}
    </FilesUploaderEditorStyled>
  )
}
