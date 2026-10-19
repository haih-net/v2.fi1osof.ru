import type * as React from 'react'
import type { UserNoNestingFragment } from 'app/gql/generated'
import { getResizedImagePath } from '../../../helpers/getResizedImagePath'
import { UserLinkStyled } from './styles'
export function createUserLink(
  user: Pick<UserNoNestingFragment, 'id'>,
): string {
  return `/users/${encodeURIComponent(user.id)}`
}
export const UserLink: React.FC<{
  user: UserNoNestingFragment
  size?: 'small' | 'normal' | 'big'
}> = ({ user, size = 'normal' }) => (
  <UserLinkStyled to={createUserLink(user)} data-size={size}>
    {user.image && (
      <img
        src={getResizedImagePath({ path: user.image, size: 'avatar' })}
        alt=""
        loading="lazy"
      />
    )}
    <span>{user.fullname || user.username || user.id}</span>
  </UserLinkStyled>
)
