import { useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import type { TypedDocumentNode } from '@apollo/client'
import { useRevalidator } from 'react-router'

export type SiteMutation = TypedDocumentNode<
  { response: { id: string } },
  Record<string, unknown>
>

export function useSiteMutation(): {
  loading: boolean
  error: string
  run: (
    mutation: SiteMutation,
    variables: Record<string, unknown>,
  ) => Promise<string | null>
} {
  const client = useApolloClient()
  const revalidator = useRevalidator()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  return {
    loading,
    error,
    run: async (mutation, variables) => {
      setLoading(true)
      setError('')
      try {
        const result = await client.mutate({ mutation, variables })
        if (!result.data?.response) {
          throw new Error('Не удалось сохранить изменения')
        }
        await Promise.all([
          client.refetchQueries({ include: 'active' }),
          revalidator.revalidate(),
        ])
        return result.data.response.id
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Ошибка выполнения запроса',
        )
        return null
      } finally {
        setLoading(false)
      }
    },
  }
}
