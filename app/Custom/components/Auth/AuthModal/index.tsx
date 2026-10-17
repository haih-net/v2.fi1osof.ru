import React from 'react'
import { Modal } from '../../Modal'
import { SignInForm } from '../SignInForm'
import { AuthProviders } from '../AuthProviders'

export interface AuthModalProps {
  referrerToken?: string | null
  isOpen: boolean
  onClose: (() => void) | undefined
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  referrerToken,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Войти">
    <SignInForm onSuccessHandler={onClose} />
    <AuthProviders onSuccessHandler={onClose} referrerToken={referrerToken} />
  </Modal>
)
