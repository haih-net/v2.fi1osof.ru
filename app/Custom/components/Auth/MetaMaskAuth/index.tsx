import React, { useCallback, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { CombinedGraphQLErrors } from '@apollo/client'
import {
  useAuthEthAccountMutation,
  useEthAccountNonceMutation,
} from 'app/gql/generated'
import { MetaMaskAuthStyled } from './styles'
import { Button } from '../../Button'

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string
        params?: unknown[]
      }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}

export interface MetaMaskAuthProps {
  onSuccess?: () => void
  referrerToken?: string | null
  disabled?: boolean
  mode?: 'signin' | 'link'
}

export const MetaMaskAuth: React.FC<MetaMaskAuthProps> = ({
  onSuccess,
  referrerToken = null,
  disabled = false,
  mode = 'signin',
}) => {
  const client = useApolloClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const [getNonce] = useEthAccountNonceMutation()
  const [authEthAccount] = useAuthEthAccountMutation()

  const handleConnect = useCallback(async (): Promise<void> => {
    if (disabled || pending.current) {
      return
    }
    setError(null)
    const provider = window.ethereum
    if (!provider?.isMetaMask) {
      setError(
        mode === 'link'
          ? 'Установите MetaMask, чтобы привязать кошелёк.'
          : 'Установите MetaMask, чтобы войти с помощью кошелька.',
      )
      return
    }
    pending.current = true
    setLoading(true)
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
        throw new Error('Аккаунт кошелька не выбран.')
      }
      const address = accounts[0]
      const nonceResult = await getNonce({ variables: { address } })
      const { nonce, message } = nonceResult.data?.ethAccountNonce ?? {}
      if (!nonce || !message) {
        throw new Error(
          mode === 'link'
            ? 'Не удалось получить одноразовый код для привязки кошелька.'
            : 'Не удалось получить одноразовый код для входа.',
        )
      }
      const hexMessage =
        '0x' +
        Array.from(new TextEncoder().encode(message), (byte) =>
          byte.toString(16).padStart(2, '0'),
        ).join('')
      const signature = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, address],
      })
      if (typeof signature !== 'string') {
        throw new Error('Не удалось подписать сообщение.')
      }
      const { data } = await authEthAccount({
        variables: { data: { address, signature, nonce, referrerToken } },
      })
      const response = data?.response
      if (!response?.success || !response.token) {
        throw new Error(
          response?.message ||
            (mode === 'link'
              ? 'Не удалось привязать кошелёк.'
              : 'Не удалось войти.'),
        )
      }
      localStorage.setItem('token', response.token)
      await client.resetStore()
      onSuccess?.()
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : null
      if (code === 4001) {
        setError('Запрос в MetaMask отменён. Попробуйте ещё раз.')
      } else if (code === -32002) {
        setError('Откройте MetaMask, чтобы завершить ожидающий запрос.')
      } else if (
        CombinedGraphQLErrors.is(error) &&
        error.errors.some(
          (item) =>
            item.message === 'Для регистрации требуется токен приглашения',
        )
      ) {
        setError(
          'Для регистрации нужно приглашение. Войдите с ранее привязанным кошельком или воспользуйтесь ссылкой-приглашением.',
        )
      } else if (
        CombinedGraphQLErrors.is(error) &&
        error.errors.some(
          (item) =>
            item.message ===
            'Приглашение недействительно или срок его действия истёк',
        )
      ) {
        setError('Приглашение недействительно или срок его действия истёк.')
      } else {
        setError(
          error instanceof Error
            ? error.message
            : mode === 'link'
              ? 'Не удалось привязать кошелёк. Попробуйте ещё раз.'
              : 'Не удалось войти. Попробуйте ещё раз.',
        )
      }
    } finally {
      pending.current = false
      setLoading(false)
    }
  }, [
    authEthAccount,
    client,
    disabled,
    getNonce,
    mode,
    onSuccess,
    referrerToken,
  ])

  return (
    <MetaMaskAuthStyled aria-busy={loading}>
      <Button
        type="button"
        variant="secondary"
        onClick={handleConnect}
        disabled={disabled || loading}
      >
        {loading
          ? 'Подключение…'
          : mode === 'link'
            ? 'Привязать MetaMask'
            : 'Войти через MetaMask'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </MetaMaskAuthStyled>
  )
}
