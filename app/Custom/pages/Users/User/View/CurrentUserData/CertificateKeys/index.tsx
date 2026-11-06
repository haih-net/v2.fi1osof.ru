import React, { useCallback, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { MeDocument } from 'app/gql/generated'
import { KeyRound } from 'lucide-react'
import { Button } from 'app/Custom/components/Button'
import { CurrentUserDataRowStyled } from '../styles'

export const CertificateKeys: React.FC<{ fingerprints: readonly string[] }> = ({
  fingerprints,
}) => {
  const client = useApolloClient()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const link = useCallback(async (): Promise<void> => {
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/client-certificate/link', {
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
        },
      })
      if (!response.ok) {
        throw new Error((await response.json()).message)
      }
      await client.refetchQueries({ include: [MeDocument] })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Не удалось привязать сертификат.',
      )
    } finally {
      setPending(false)
    }
  }, [client])
  return (
    <CurrentUserDataRowStyled>
      <span className="account-icon">
        <KeyRound size={22} aria-hidden="true" />
      </span>
      <div className="account-copy">
        <strong>Сертификаты для входа</strong>
        {fingerprints.length ? (
          fingerprints.map((fingerprint) => (
            <span key={fingerprint}>{fingerprint}</span>
          ))
        ) : (
          <span>Нет привязанных сертификатов</span>
        )}
        {error && <span role="alert">{error}</span>}
      </div>
      <Button type="button" disabled={pending} onClick={link}>
        Привязать сертификат
      </Button>
    </CurrentUserDataRowStyled>
  )
}
