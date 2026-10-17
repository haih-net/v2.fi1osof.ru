import React from 'react'
import { useSearchParams } from 'react-router'
import { AuthProviders } from 'app/Custom/components/Auth/AuthProviders'
import { SignInForm } from 'app/Custom/components/Auth/SignInForm'
import { useAuthedRedirect } from 'app/Custom/components/Auth/hooks/useAuthedRedirect'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { SignInPageStyled } from './styles'

export const SignInPage: React.FC = () => {
  useAuthedRedirect()
  const [params] = useSearchParams()
  const { user, userLoading } = useAppContext()
  return (
    <SignInPageStyled>
      <h1 tabIndex={-1}>Войти</h1>
      <p>Войдите в свою учётную запись.</p>
      <SignInForm loading={userLoading || Boolean(user)} />
      <AuthProviders
        referrerToken={params.get('referrerToken')}
        disabled={userLoading || Boolean(user)}
      />
    </SignInPageStyled>
  )
}
