import {
  MeUserFragment,
  UsersConnectionQueryVariables,
  UserStatusEnum,
} from 'app/gql/generated'

type getUsersQueryVariablesProps = {
  page: number
  first?: number
  currentUser: MeUserFragment | null | undefined
}

export function getUsersQueryVariables({
  currentUser,
  page,
  first = 10,
}: getUsersQueryVariablesProps): UsersConnectionQueryVariables {
  return {
    where: { status: currentUser ? undefined : UserStatusEnum.ACTIVE },
    skip: (page - 1) * first,
    first,
  }
}
