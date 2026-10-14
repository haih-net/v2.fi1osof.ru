import React, { useCallback, useState } from 'react'
import { SnackbarContext } from '../../hooks/useSnackbar'
interface Message {
  id: string
  text: string
}
export const SnackbarProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const addMessage = useCallback(
    (text: string) =>
      setMessages((values) => [...values, { id: crypto.randomUUID(), text }]),
    [],
  )
  const dismiss = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.value
    setMessages((values) => values.filter((message) => message.id !== id))
  }, [])
  return (
    <SnackbarContext.Provider value={{ addMessage }}>
      {children}
      <div role="status">
        {messages.map((message) => (
          <div key={message.id}>
            {message.text}
            <button value={message.id} onClick={dismiss}>
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  )
}
