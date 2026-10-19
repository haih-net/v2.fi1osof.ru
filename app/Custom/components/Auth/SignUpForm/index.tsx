import React, { useCallback, useId, useRef, useState } from 'react'
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
  type ControllerProps,
} from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useSearchParams } from 'react-router'
import { useApolloClient } from '@apollo/client/react'
import { useSignupMutation, type SignupMutation } from 'app/gql/generated'
import { Button } from '../../Button'
import { AuthProviders } from '../AuthProviders'
import { GET_PARAM_REFERRERTOKEN_NAME, type SignUpFormData } from './interfaces'
import { invitationRequired, signUpSchema } from './schema'
import { SignUpFormStyled } from './styles'

export interface SignUpFormProps {
  onSuccessHandler?: (data: SignupMutation['response']) => void
  loading?: boolean
}

type SignUpField =
  'fullname' | 'username' | 'email' | 'password' | 'referrerToken'

const fields: Record<
  SignUpField,
  { label: string; type: string; autoComplete: string }
> = {
  fullname: { label: 'Полное имя', type: 'text', autoComplete: 'name' },
  username: { label: 'Логин', type: 'text', autoComplete: 'username' },
  email: { label: 'Электронная почта', type: 'email', autoComplete: 'email' },
  password: { label: 'Пароль', type: 'password', autoComplete: 'new-password' },
  referrerToken: {
    label: 'Токен приглашения',
    type: 'text',
    autoComplete: 'off',
  },
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
  const [error, setError] = useState<string | null>(null)
  const form = useForm<SignUpFormData>({
    defaultValues: {
      fullname: '',
      username: '',
      email: '',
      password: '',
      referrerToken: params.get(GET_PARAM_REFERRERTOKEN_NAME) ?? undefined,
      isAiAgent: false,
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(signUpSchema),
  })
  const referrerToken = useWatch({
    control: form.control,
    name: 'referrerToken',
  })
  const showInvitationOnly = invitationRequired && referrerToken === undefined
  const disabled = loading || form.formState.isSubmitting
  const submit = useCallback(
    async (data: SignUpFormData): Promise<void> => {
      if (loading || pending.current) {
        return
      }
      pending.current = true
      setError(null)
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
      }
    },
    [loading, signup, client, onSuccessHandler],
  )

  const fieldRenderer = useCallback<
    ControllerProps<SignUpFormData, SignUpField>['render']
  >(
    ({ field, fieldState: { error } }) => {
      const { label, type, autoComplete } = fields[field.name]
      const fieldId = `${id}-${field.name}`
      return (
        <>
          <label htmlFor={fieldId}>{label}</label>
          <input
            {...field}
            value={field.value ?? ''}
            id={fieldId}
            type={type}
            autoComplete={autoComplete}
            required={
              field.name === 'password' ||
              (field.name === 'referrerToken' && invitationRequired)
            }
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
    <SignUpFormStyled
      onSubmit={form.handleSubmit(submit)}
      noValidate
      aria-busy={disabled}
    >
      <FormProvider {...form}>
        {showInvitationOnly && (
          <p>
            Регистрация доступна только по приглашению. Введите токен
            приглашения, чтобы заполнить данные учётной записи.
          </p>
        )}
        <Controller
          name="referrerToken"
          control={form.control}
          render={fieldRenderer}
        />
        {!showInvitationOnly && (
          <>
            <Controller
              name="fullname"
              control={form.control}
              render={fieldRenderer}
            />
            <Controller
              name="email"
              control={form.control}
              rules={{ deps: 'username' }}
              render={fieldRenderer}
            />
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
              {disabled ? 'Регистрация…' : 'Зарегистрироваться'}
            </Button>
            <AuthProviders
              onSuccessHandler={onSuccessHandler}
              referrerToken={referrerToken?.trim() || null}
              disabled={disabled}
            />
          </>
        )}
      </FormProvider>
    </SignUpFormStyled>
  )
}
