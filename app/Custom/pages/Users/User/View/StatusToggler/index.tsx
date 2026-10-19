import { UserStatusStyled, UserStatusActionsStyled } from './styles'
import { useCallback } from 'react'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import {
  UserFragment,
  UserStatusEnum,
  useUpdateUserMutation,
} from 'app/gql/generated'
import { Button } from 'app/Custom/components/Button'

type StatusTogglerProps = {
  user: UserFragment
}

export const StatusToggler: React.FC<StatusTogglerProps> = ({ user }) => {
  const { user: currentUser } = useAppContext()

  const { id, status } = user

  const [mutation, { loading, error }] = useUpdateUserMutation()

  let newStatus: UserStatusEnum

  switch (status) {
    case UserStatusEnum.ACTIVE:
      newStatus = UserStatusEnum.BLOCKED
      break

    default:
      newStatus = UserStatusEnum.ACTIVE
  }

  const onClickToggleStatus = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()

      void mutation({
        variables: {
          where: {
            id,
          },
          data: {
            status: newStatus,
          },
        },
      }).catch(() => undefined)
    },
    [mutation, newStatus, id],
  )

  const label =
    status === UserStatusEnum.BLOCKED
      ? 'Заблокирован'
      : status === UserStatusEnum.NEWBIE
        ? 'Новый'
        : 'Активен'
  return (
    <UserStatusActionsStyled>
      <UserStatusStyled data-status={status}>{label}</UserStatusStyled>
      {currentUser?.sudo && currentUser.id !== id && (
        <Button
          size="small"
          variant={status === UserStatusEnum.ACTIVE ? 'danger' : 'secondary'}
          onClick={onClickToggleStatus}
          disabled={loading}
        >
          {loading
            ? 'Сохранение…'
            : status === UserStatusEnum.ACTIVE
              ? 'Заблокировать'
              : status === UserStatusEnum.BLOCKED
                ? 'Разблокировать'
                : 'Активировать'}
        </Button>
      )}
      {error && <p role="alert">{error.message}</p>}
    </UserStatusActionsStyled>
  )
}
