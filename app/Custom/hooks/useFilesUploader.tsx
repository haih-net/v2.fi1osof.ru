import { useApolloClient } from '@apollo/client/react'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import {
  SingleUploadDocument,
  SingleUploadMutation,
  SingleUploadMutationVariables,
} from 'app/gql/generated'

export type FileUploadStatus =
  'pending' | 'uploading' | 'success' | 'error' | 'cancelled'

export type FileUploadItem = {
  id: string
  file: File
  name: string
  size: number
  type: string
  status: FileUploadStatus
  progress: number
  error?: string
  result?: SingleUploadMutation['singleUpload']
  abortController?: AbortController
}

type UploaderState = {
  files: FileUploadItem[]
}

type UploaderAction =
  | { type: 'ADD_FILES'; payload: FileUploadItem[] }
  | {
      type: 'UPDATE_STATUS'
      payload: {
        id: string
        status: FileUploadStatus
        error?: string
        result?: SingleUploadMutation['singleUpload']
      }
    }
  | {
      type: 'SET_ABORT_CONTROLLER'
      payload: { id: string; abortController: AbortController }
    }
  | { type: 'SYNC_PROGRESS'; payload: Record<string, number> }
  | { type: 'CANCEL_ALL' }
  | { type: 'REMOVE_FILE'; payload: { id: string } }
  | { type: 'CLEAR_COMPLETED' }

function uploaderReducer(
  state: UploaderState,
  action: UploaderAction,
): UploaderState {
  switch (action.type) {
    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.payload] }

    case 'UPDATE_STATUS':
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id
            ? {
                ...f,
                status: action.payload.status,
                error: action.payload.error,
                result: action.payload.result,
              }
            : f,
        ),
      }

    case 'SET_ABORT_CONTROLLER':
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.payload.id
            ? { ...f, abortController: action.payload.abortController }
            : f,
        ),
      }

    case 'SYNC_PROGRESS':
      return {
        ...state,
        files: state.files.map((f) => {
          const newProgress = action.payload[f.id]
          if (newProgress !== undefined && newProgress !== f.progress) {
            return { ...f, progress: newProgress }
          }
          return f
        }),
      }

    case 'CANCEL_ALL':
      return {
        ...state,
        files: state.files.map((f) => {
          if (f.status === 'pending' || f.status === 'uploading') {
            f.abortController?.abort()
            return { ...f, status: 'cancelled' as const }
          }
          return f
        }),
      }

    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((f) => f.id !== action.payload.id),
      }

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        files: state.files.filter(
          (f) => f.status === 'pending' || f.status === 'uploading',
        ),
      }

    default:
      return state
  }
}

export type useFilesUploaderProps = {
  multiple?: boolean
  progressUpdateInterval?: number
  onUploadComplete?: (file: FileUploadItem) => void
}

export function useFilesUploader({
  multiple = false,
  progressUpdateInterval = 1000,
  onUploadComplete,
}: useFilesUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const client = useApolloClient()

  const [state, dispatch] = useReducer(uploaderReducer, { files: [] })

  const progressRef = useRef<Record<string, number>>({})

  const { addMessage } = useSnackbar() || {}

  useEffect(() => {
    const hasUploading = state.files.some((f) => f.status === 'uploading')

    if (!hasUploading) {
      return
    }

    const interval = setInterval(() => {
      dispatch({ type: 'SYNC_PROGRESS', payload: { ...progressRef.current } })
    }, progressUpdateInterval)

    return () => clearInterval(interval)
  }, [state.files, progressUpdateInterval])

  const uploadFile = useCallback(
    async (item: FileUploadItem) => {
      const abortController = new AbortController()
      dispatch({
        type: 'SET_ABORT_CONTROLLER',
        payload: { id: item.id, abortController },
      })
      dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: item.id, status: 'uploading' },
      })

      progressRef.current[item.id] = 0

      try {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const { data } = await client.mutate<
          SingleUploadMutation,
          SingleUploadMutationVariables
        >({
          mutation: SingleUploadDocument,
          variables: {
            data: {
              file: item.file,
            },
          },
          context: {
            fetchOptions: {
              signal: abortController.signal,
              onUploadProgress: (percent: number) => {
                progressRef.current[item.id] = percent
              },
            },
          },
        })

        progressRef.current[item.id] = 100

        dispatch({
          type: 'UPDATE_STATUS',
          payload: {
            id: item.id,
            status: 'success',
            result: data?.singleUpload,
          },
        })

        onUploadComplete?.({
          ...item,
          status: 'success',
          result: data?.singleUpload,
        })
      } catch (error) {
        delete progressRef.current[item.id]

        addMessage?.((error as Error)?.message || 'File upload error', {
          variant: 'error',
        })

        if ((error as Error).name === 'AbortError') {
          dispatch({
            type: 'UPDATE_STATUS',
            payload: { id: item.id, status: 'cancelled' },
          })
        } else {
          dispatch({
            type: 'UPDATE_STATUS',
            payload: {
              id: item.id,
              status: 'error',
              error: (error as Error).message,
            },
          })
        }
      }
    },
    [client, onUploadComplete, addMessage],
  )

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      if (!fileList || fileList.length === 0) {
        return
      }

      const newItems: FileUploadItem[] = Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending' as const,
        progress: 0,
      }))

      dispatch({ type: 'ADD_FILES', payload: newItems })

      newItems.forEach((item) => {
        uploadFile(item)
      })

      event.target.value = ''
    },
    [uploadFile],
  )

  const cancelAll = useCallback(() => {
    dispatch({ type: 'CANCEL_ALL' })
  }, [])

  const removeFile = useCallback(
    (id: string) => {
      const file = state.files.find((f) => f.id === id)
      if (file?.status === 'uploading') {
        file.abortController?.abort()
      }
      dispatch({ type: 'REMOVE_FILE', payload: { id } })
    },
    [state.files],
  )

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }, [])

  const openFilePicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const [isDragging, setIsDragging] = useState(false)

  const addFiles = useCallback(
    (fileList: FileList) => {
      const newItems: FileUploadItem[] = Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending' as const,
        progress: 0,
      }))

      dispatch({ type: 'ADD_FILES', payload: newItems })

      newItems.forEach((item) => {
        uploadFile(item)
      })
    },
    [uploadFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const fileList = e.dataTransfer.files
      if (fileList.length > 0) {
        if (!multiple && fileList.length > 1) {
          const dt = new DataTransfer()
          dt.items.add(fileList[0])
          addFiles(dt.files)
        } else {
          addFiles(fileList)
        }
      }
    },
    [addFiles, multiple],
  )

  const getRootProps = useCallback(
    () => ({
      onClick: openFilePicker,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    }),
    [openFilePicker, handleDragOver, handleDragLeave, handleDrop],
  )

  const isUploading = state.files.some((f) => f.status === 'uploading')

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple={multiple}
      onChange={handleInputChange}
      style={{ display: 'none' }}
    />
  )

  return {
    input,
    files: state.files,
    isDragging,
    isUploading,
    getRootProps,
    openFilePicker,
    cancelAll,
    removeFile,
    clearCompleted,
  }
}
