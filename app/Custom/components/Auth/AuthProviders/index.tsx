import type React from 'react'
import type { SigninMutation } from 'app/gql/generated'
import { AuthProvidersStyled } from './styles'
import { TelegramAuthForm } from '../../TelegramAuthForm'
import { MetaMaskAuth } from '../MetaMaskAuth'

type AuthProvidersProps = {
  onSuccessHandler?: (data?: SigninMutation['response']) => void
  referrerToken?: string | null
  disabled?: boolean
}

export const AuthProviders: React.FC<AuthProvidersProps> = ({
  onSuccessHandler,
  referrerToken = null,
  disabled = false,
}) => (
  <AuthProvidersStyled>
    <MetaMaskAuth
      onSuccess={onSuccessHandler}
      referrerToken={referrerToken}
      disabled={disabled}
    />
    <TelegramAuthForm
      onAuthSuccessHandler={onSuccessHandler}
      referrerToken={referrerToken}
      disabled={disabled}
    />
  </AuthProvidersStyled>
)
