import React, { useCallback, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { Button } from '../../Button'

export type SignOutButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  'onClick' | 'children'
>

export const SignOutButton: React.FC<SignOutButtonProps> = ({
  disabled,
  ...props
}) => {
  const client = useApolloClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handleSignOut = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      localStorage.removeItem('token')
      await client.resetStore()
    } catch {
      setError('Не удалось завершить выход. Обновите страницу.')
    } finally {
      setLoading(false)
    }
  }, [client])
  return (
    <>
      <Button
        variant="secondary"
        {...props}
        disabled={disabled || loading}
        onClick={handleSignOut}
      >
        Выйти
      </Button>
      {error && <span role="alert">{error}</span>}
    </>
  )
}
