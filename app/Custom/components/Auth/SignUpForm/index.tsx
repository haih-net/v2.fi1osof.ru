import React, { useCallback, useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useApolloClient } from '@apollo/client/react'
import { useSignupMutation, type SignupMutation } from 'app/gql/generated'
import { Button } from '../../Button'
import { GET_PARAM_REFERRERTOKEN_NAME, type SignUpFormData } from './interfaces'
import { validateSignUpForm } from './schema'
import { SignUpFormStyled } from './styles'

export interface SignUpFormProps {
  onSuccessHandler?: (data: SignupMutation['response']) => void
  loading?: boolean
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccessHandler,
  loading = false,
}) => {
  const [params] = useSearchParams()
  const id = useId()
  const client = useApolloClient()
  const [signup] = useSignupMutation()
  const pending = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = loading || submitting
  const submit = useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (loading || pending.current) {
        return
      }
      const form = new FormData(event.currentTarget)
      const data: SignUpFormData = {
        fullname: String(form.get('fullname') ?? '').trim(),
        username: String(form.get('username') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
        referrerToken: String(form.get('referrerToken') ?? '').trim() || null,
        isAiAgent: false,
      }
      const validationError = validateSignUpForm(data)
      setError(validationError)
      if (validationError) {
        return
      }
      pending.current = true
      setSubmitting(true)
      try {
        const result = await signup({ variables: { data } })
        const response = result.data?.response
        if (!response?.success || !response.token) {
          throw new Error(response?.message || 'Не удалось зарегистрироваться')
        }
        localStorage.setItem('token', response.token)
        await client.resetStore()
        onSuccessHandler?.(response)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Не удалось зарегистрироваться',
        )
      } finally {
        pending.current = false
        setSubmitting(false)
      }
    },
    [loading, signup, client, onSuccessHandler],
  )

  return (
    <SignUpFormStyled onSubmit={submit} aria-busy={disabled}>
      <label htmlFor={`${id}-fullname`}>Полное имя</label>
      <input
        id={`${id}-fullname`}
        name="fullname"
        autoComplete="name"
        disabled={disabled}
      />
      <label htmlFor={`${id}-email`}>Электронная почта</label>
      <input
        id={`${id}-email`}
        name="email"
        type="email"
        autoComplete="email"
        disabled={disabled}
      />
      <label htmlFor={`${id}-username`}>Логин</label>
      <input
        id={`${id}-username`}
        name="username"
        autoComplete="username"
        disabled={disabled}
      />
      <label htmlFor={`${id}-password`}>Пароль</label>
      <input
        id={`${id}-password`}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        disabled={disabled}
      />
      <label htmlFor={`${id}-referrer`}>Токен приглашения</label>
      <input
        id={`${id}-referrer`}
        name="referrerToken"
        defaultValue={params.get(GET_PARAM_REFERRERTOKEN_NAME) ?? ''}
        disabled={disabled}
      />
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={disabled}>
        {disabled ? 'Регистрация…' : 'Зарегистрироваться'}
      </Button>
    </SignUpFormStyled>
  )
}
