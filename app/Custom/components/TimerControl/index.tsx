import type {
  CreateTimerMutation,
  CreateTimerMutationVariables,
  UpdateTimerMutation,
  UpdateTimerMutationVariables,
} from '../../../gql/generated'
import { useCallback, type FC } from 'react'
import {
  CreateTimerDocument,
  UpdateTimerDocument,
} from '../../../gql/generated'
import { useAppContext } from '../../hooks/useAppContext'
import { useSiteMutation } from '../../hooks/useSiteMutation'

export const TimerControl: FC<{
  taskId?: string
  timer?: { id: string; createdById?: string; stoppedAt?: string | null }
}> = ({ taskId, timer }) => {
  const { user } = useAppContext()
  const { run, loading } = useSiteMutation()
  const onClick = useCallback(() => {
    if (loading) {
      return
    }
    if (timer) {
      void run<UpdateTimerMutation, UpdateTimerMutationVariables>(
        UpdateTimerDocument,
        {
          where: { id: timer.id },
          data: { stoppedAt: new Date().toISOString() },
        },
      )
    } else if (taskId) {
      void run<CreateTimerMutation, CreateTimerMutationVariables>(
        CreateTimerDocument,
        { data: { taskId } },
      )
    }
  }, [run, timer, taskId, loading])
  if (!user || (timer && (timer.stoppedAt || timer.createdById !== user.id))) {
    return null
  }
  return (
    <>
      <button type="button" disabled={loading} onClick={onClick}>
        {timer ? 'Остановить' : 'Запустить таймер'}
      </button>
    </>
  )
}
