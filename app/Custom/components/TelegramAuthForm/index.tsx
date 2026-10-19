import React, { useEffect, useId, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import {
  useAuthViaTelegramMutation,
  type TelegramAuthDataInput,
} from 'app/gql/generated'

export const TelegramAuthForm: React.FC<{
  onAuthSuccessHandler?: () => void
  buttonSize?: 'small' | 'medium' | 'large'
  referrerToken: string | null
  disabled?: boolean
}> = ({
  onAuthSuccessHandler,
  buttonSize = 'large',
  referrerToken,
  disabled = false,
}) => {
  const container = useRef<HTMLDivElement>(null)
  const callback = `telegramAuth${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [auth] = useAuthViaTelegramMutation()
  const client = useApolloClient()
  const [error, setError] = useState<string | null>(null)
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME
  useEffect(() => {
    if (!container.current || !botName || disabled) {
      return
    }
    const target = container.current
    const callbacks = window as unknown as Record<string, unknown>
    let pending = false
    callbacks[callback] = async (
      data: Omit<TelegramAuthDataInput, 'id'> & { id: number | string },
    ): Promise<void> => {
      if (pending) {
        return
      }
      pending = true
      setError(null)
      try {
        const result = await auth({
          variables: {
            tgAuthData: {
              id: String(data.id),
              first_name: data.first_name,
              last_name: data.last_name,
              username: data.username,
              photo_url: data.photo_url,
              auth_date: data.auth_date,
              hash: data.hash,
              referrerToken,
            },
          },
        })
        const response = result.data?.authViaTelegram
        if (!response?.success || !response.token) {
          throw new Error(
            response?.message || 'Не удалось войти через Telegram',
          )
        }
        localStorage.setItem('token', response.token)
        await client.resetStore()
        onAuthSuccessHandler?.()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Не удалось войти через Telegram',
        )
      } finally {
        pending = false
      }
    }
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', buttonSize)
    script.setAttribute('data-onauth', `${callback}(user)`)
    target.appendChild(script)
    return () => {
      delete callbacks[callback]
      target.replaceChildren()
    }
  }, [
    botName,
    buttonSize,
    callback,
    disabled,
    auth,
    client,
    onAuthSuccessHandler,
    referrerToken,
  ])
  return botName ? (
    <div>
      <div ref={container} />
      {error && <p role="alert">{error}</p>}
    </div>
  ) : null
}
