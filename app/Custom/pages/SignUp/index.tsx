import type * as React from 'react'
import { Link } from 'react-router'
import { SignUpForm } from 'app/Custom/components/Auth/SignUpForm'
import { useAuthedRedirect } from 'app/Custom/components/Auth/hooks/useAuthedRedirect'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { SignUpPageStyled } from './styles'
export const SignUpPage: React.FC = () => {
  useAuthedRedirect('/')
  const { user, userLoading = true } = useAppContext() ?? {}
  return (
    <SignUpPageStyled>
      <h1>Регистрация</h1>
      <SignUpForm loading={userLoading || Boolean(user)} />
      <p>
        <Link to="/signin">Уже есть учётная запись? Войти</Link>
      </p>
    </SignUpPageStyled>
  )
}
