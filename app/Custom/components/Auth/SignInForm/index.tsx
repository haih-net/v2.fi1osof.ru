import React, { useCallback, useId, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { useSigninMutation, type SigninMutation } from 'app/gql/generated'
import { Button } from '../../Button'
import { SignInFormStyled } from './styles'

export interface SignInFormProps {
  onSuccessHandler?: (data: SigninMutation['response']) => void
  loading?: boolean
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSuccessHandler,
  loading = false,
}) => {
  const id = useId()
  const client = useApolloClient()
  const [signin] = useSigninMutation()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const disabled = loading || submitting

  const onSubmit = useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (loading || pending.current) {
        return
      }
      const form = new FormData(event.currentTarget)
      const username = String(form.get('username') ?? '').trim()
      const password = String(form.get('password') ?? '')
      if (!username || !password) {
        setError('Введите логин и пароль.')
        return
      }
      pending.current = true
      setSubmitting(true)
      setError(null)
      try {
        const { data } = await signin({
          variables: { where: { username }, data: { password } },
        })
        const response = data?.response
        if (!response?.success || !response.token) {
          setError('Неверный логин или пароль.')
          return
        }
        localStorage.setItem('token', response.token)
        await client.resetStore()
        onSuccessHandler?.(response)
      } catch {
        setError('Не удалось войти. Попробуйте ещё раз.')
      } finally {
        pending.current = false
        setSubmitting(false)
      }
    },
    [loading, signin, client, onSuccessHandler],
  )

  return (
    <SignInFormStyled onSubmit={onSubmit} aria-busy={disabled}>
      <label htmlFor={`${id}-username`}>Логин</label>
      <input
        id={`${id}-username`}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        disabled={disabled}
      />
      <label htmlFor={`${id}-password`}>Пароль</label>
      <input
        id={`${id}-password`}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        disabled={disabled}
      />
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={disabled}>
        {disabled ? 'Вход…' : 'Войти'}
      </Button>
    </SignInFormStyled>
  )
}
