import React, { useCallback, useId, useRef, useState } from 'react'
import {
  Controller,
  FormProvider,
  useForm,
  type ControllerProps,
} from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useApolloClient } from '@apollo/client/react'
import { useSigninMutation, type SigninMutation } from 'app/gql/generated'
import { Button } from '../../Button'
import { SignInFormData } from './interfaces'
import { signInSchema } from './schema'
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
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const form = useForm<SignInFormData>({
    defaultValues: { username: '', password: '' },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(signInSchema),
  })
  const disabled = loading || form.formState.isSubmitting

  const onSubmit = useCallback(
    async ({ username, password }: SignInFormData): Promise<void> => {
      if (loading || pending.current) {
        return
      }
      pending.current = true
      setError(null)
      try {
        const { data } = await signin({
          variables: {
            where: username.includes('@') ? { email: username } : { username },
            data: { password },
          },
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
      }
    },
    [loading, signin, client, onSuccessHandler],
  )

  const fieldRenderer = useCallback<ControllerProps<SignInFormData>['render']>(
    ({ field, fieldState: { error } }) => {
      const isPassword = field.name === 'password'
      const fieldId = `${id}-${field.name}`
      return (
        <>
          <label htmlFor={fieldId}>
            {isPassword ? 'Пароль' : 'Логин или электронная почта'}
          </label>
          <input
            {...field}
            id={fieldId}
            type={isPassword ? 'password' : 'text'}
            autoComplete={isPassword ? 'current-password' : 'username'}
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${fieldId}-error` : undefined}
          />
          {error && (
            <p id={`${fieldId}-error`} role="alert">
              {error.message}
            </p>
          )}
        </>
      )
    },
    [disabled, id],
  )

  return (
    <SignInFormStyled
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      aria-busy={disabled}
    >
      <FormProvider {...form}>
        <Controller
          name="username"
          control={form.control}
          render={fieldRenderer}
        />
        <Controller
          name="password"
          control={form.control}
          render={fieldRenderer}
        />
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Вход…' : 'Войти'}
        </Button>
      </FormProvider>
    </SignInFormStyled>
  )
}
