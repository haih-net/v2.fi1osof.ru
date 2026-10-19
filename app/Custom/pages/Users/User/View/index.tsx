import type { MeUserFragment, UserFragment } from 'app/gql/generated'
import { Link } from 'react-router'
import { useCallback, useState } from 'react'
import {
  UserPageViewStyled,
  UserPageActionsStyled,
  UserPageViewToolbarStyled,
  UserPageViewAvatarStyled,
  UserPageViewInfoStyled,
} from './styles'
import { UserEditForm } from './Form'
import { Button } from 'app/Custom/components/Button'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { Markdown } from 'app/Custom/components/Markdown'
import { FormattedDate } from 'app/Custom/components/FormattedDate'
import { CurrentUserData } from './CurrentUserData'
import { SendTransfer } from './SendTransfer'
import { StatusToggler } from './StatusToggler'
import { GetReferrerToken } from './GetReferrerToken'
import { getResizedImagePath } from 'app/Custom/helpers/getResizedImagePath'

export const UserPageView: React.FC<{
  user: UserFragment | MeUserFragment
}> = ({ user }) => {
  const { user: currentUser } = useAppContext()
  const [isEditing, setIsEditing] = useState(false)
  const isCurrentUser = currentUser?.id === user.id
  const handleEditClick = useCallback(() => setIsEditing(true), [])
  const handleCloseForm = useCallback(() => setIsEditing(false), [])
  const name = user.fullname || user.username || user.id
  return (
    <UserPageViewStyled>
      {currentUser?.sudo === true && (
        <Link to="/users" className="back-link">
          ← Пользователи
        </Link>
      )}
      <UserPageViewToolbarStyled>
        {user.image ? (
          <UserPageViewAvatarStyled
            alt={name}
            src={getResizedImagePath({ path: user.image, size: 'avatar' })}
          />
        ) : (
          <span className="profile-avatar" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="profile-heading">
          <h1>{name}</h1>
          <StatusToggler user={user} />
          <p className="profile-meta">
            {user.username ? `@${user.username} · ` : ''}На сайте с{' '}
            <FormattedDate value={user.createdAt} />
          </p>
        </div>
        {isCurrentUser && !isEditing && (
          <UserPageActionsStyled>
            <Button onClick={handleEditClick}>Редактировать профиль</Button>
          </UserPageActionsStyled>
        )}
      </UserPageViewToolbarStyled>
      {isEditing && isCurrentUser ? (
        <UserPageViewInfoStyled>
          <h2>Редактирование профиля</h2>
          <UserEditForm user={user} closeForm={handleCloseForm} />
        </UserPageViewInfoStyled>
      ) : (
        <UserPageViewInfoStyled>
          <h2>О пользователе</h2>
          {user.intro && <Markdown>{user.intro}</Markdown>}
          {user.content ? (
            <Markdown>{user.content}</Markdown>
          ) : (
            !user.intro && (
              <p className="empty-profile">
                Пользователь пока не добавил описание.
              </p>
            )
          )}
        </UserPageViewInfoStyled>
      )}
      {isCurrentUser && currentUser && (
        <>
          <CurrentUserData currentUser={currentUser} />
          <GetReferrerToken />
        </>
      )}
      {!isCurrentUser && currentUser && (
        <SendTransfer currentUser={currentUser} recipient={user} />
      )}
    </UserPageViewStyled>
  )
}
