import React from 'react'
import { Link, useSearchParams } from 'react-router'
import { AuthProviders } from 'app/Custom/components/Auth/AuthProviders'
import { SignInForm } from 'app/Custom/components/Auth/SignInForm'
import { useAuthedRedirect } from 'app/Custom/components/Auth/hooks/useAuthedRedirect'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { SignInPageStyled, SignInRegistrationStyled } from './styles'

export const SignInPage: React.FC = () => {
  useAuthedRedirect('/panel/profile')
  const [params] = useSearchParams()
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <SignInPageStyled>
      <h1 tabIndex={-1}>Войти</h1>
      <p>Войдите в свою учётную запись.</p>
      <SignInForm loading={userLoading || Boolean(user)} />
      <AuthProviders
        referrerToken={params.get('referrerToken')}
        disabled={userLoading || Boolean(user)}
      />
      <SignInRegistrationStyled>
        <p>Нет аккаунта?</p>
        <Link to={`/signup${params.size ? `?${params}` : ''}`}>
          Создать учётную запись
        </Link>
      </SignInRegistrationStyled>
    </SignInPageStyled>
  )
}
