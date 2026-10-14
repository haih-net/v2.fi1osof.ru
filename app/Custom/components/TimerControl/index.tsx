import { useCallback, type FC } from 'react'
import { gql } from '@apollo/client'
import { useAppContext } from '../../hooks/useAppContext'
import { useSiteMutation } from '../../hooks/useSiteMutation'

const start = gql`
  mutation SiteStartTimer($data: TimerCreateInput!) {
    response: createTimer(data: $data) {
      id
    }
  }
`
const stop = gql`
  mutation SiteStopTimer(
    $where: SiteObjectWhereUniqueInput!
    $data: TimerUpdateDataInput!
  ) {
    response: updateTimer(where: $where, data: $data) {
      id
    }
  }
`

export const TimerControl: FC<{
  taskId?: string
  timer?: { id: string; createdById?: string; stoppedAt?: string | null }
}> = ({ taskId, timer }) => {
  const { user } = useAppContext()
  const { run, loading, error } = useSiteMutation()
  const onClick = useCallback(() => {
    if (loading) {
      return
    }
    void run(
      timer ? stop : start,
      timer
        ? {
            where: { id: timer.id },
            data: { stoppedAt: new Date().toISOString() },
          }
        : { data: { taskId } },
    )
  }, [run, timer, taskId, loading])
  if (!user || (timer && (timer.stoppedAt || timer.createdById !== user.id))) {
    return null
  }
  return (
    <>
      <button type="button" disabled={loading} onClick={onClick}>
        {timer ? 'Остановить' : 'Запустить таймер'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
