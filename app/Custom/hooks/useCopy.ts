import { useCallback, type MouseEvent } from 'react'
import { useSnackbar } from './useSnackbar'
export function useCopy(): {
  onClickCopy: (event: MouseEvent<HTMLButtonElement>) => Promise<void>
} {
  const { addMessage } = useSnackbar() ?? {}
  const onClickCopy = useCallback(
    async (event: MouseEvent<HTMLButtonElement>): Promise<void> => {
      const text = event.currentTarget.value
      try {
        await navigator.clipboard.writeText(text)
        addMessage?.('Скопировано', { variant: 'success' })
      } catch (error) {
        addMessage?.(
          error instanceof Error ? error.message : 'Не удалось скопировать',
          { variant: 'error' },
        )
      }
    },
    [addMessage],
  )
  return { onClickCopy }
}
