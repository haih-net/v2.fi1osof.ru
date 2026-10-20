import React, { useCallback, useState } from 'react'
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
  const addMessage = useCallback<SnackbarContextValue['addMessage']>(
    (text, options) =>
      setMessages((values) => [
        ...values,
        { id: crypto.randomUUID(), text, variant: options?.variant ?? 'info' },
      ]),
    [],
  )
  const dismiss = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.value
    setMessages((values) => values.filter((message) => message.id !== id))
  }, [])
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
