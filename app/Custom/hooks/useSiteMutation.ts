import { useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import type { TypedDocumentNode, OperationVariables } from '@apollo/client'
import { useRevalidator } from 'react-router'
import { useSnackbar } from './useSnackbar'

interface MutationResponse {
  response?: { id: string } | null
}

export function useSiteMutation(): {
  loading: boolean
  run: <TData extends MutationResponse, TVariables extends OperationVariables>(
    mutation: TypedDocumentNode<TData, TVariables>,
    variables: NoInfer<TVariables>,
  ) => Promise<string | null>
} {
  const client = useApolloClient()
  const revalidator = useRevalidator()
  const [loading, setLoading] = useState(false)
  const { addMessage } = useSnackbar() || {}
  return {
    loading,
    run: async (mutation, variables) => {
      setLoading(true)
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
        addMessage?.(
          cause instanceof Error ? cause.message : 'Ошибка выполнения запроса',
          { variant: 'error' },
        )
        return null
      } finally {
        setLoading(false)
      }
    },
  }
}
