import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SnackbarMessageStyled, SnackbarStackStyled } from './styles'
import {
  SnackbarContext,
  type SnackbarContextValue,
} from '../../hooks/useSnackbar'
interface Message {
  id: string
  text: string
  variant: 'success' | 'error' | 'info' | 'warning'
}
export const SnackbarProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])
  const removeMessage = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setMessages((values) => values.filter((message) => message.id !== id))
  }, [])
  const addMessage = useCallback<SnackbarContextValue['addMessage']>(
    (text, options) => {
      const id = crypto.randomUUID()
      const autoHideDuration = options?.autoHideDuration ?? 3000
      setMessages((values) => [
        ...values,
        { id, text, variant: options?.variant ?? 'info' },
      ])
      if (autoHideDuration !== 0) {
        timersRef.current.set(
          id,
          setTimeout(() => removeMessage(id), autoHideDuration),
        )
      }
    },
    [removeMessage],
  )
  const dismiss = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      removeMessage(event.currentTarget.value)
    },
    [removeMessage],
  )
  return (
    <SnackbarContext.Provider value={{ addMessage }}>
      {children}
      <SnackbarStackStyled role="group" aria-label="Уведомления">
        {messages.map((message) => (
          <SnackbarMessageStyled
            key={message.id}
            data-variant={message.variant}
            role={
              message.variant === 'error' || message.variant === 'warning'
                ? 'alert'
                : 'status'
            }
          >
            <span>{message.text}</span>
            <button
              type="button"
              aria-label="Закрыть уведомление"
              value={message.id}
              onClick={dismiss}
            >
              ×
            </button>
          </SnackbarMessageStyled>
        ))}
      </SnackbarStackStyled>
    </SnackbarContext.Provider>
  )
}
