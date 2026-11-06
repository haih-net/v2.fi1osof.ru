import {
  MeUserFragment,
  UsersConnectionQueryVariables,
  UserStatusEnum,
} from 'app/gql/generated'

type getUsersQueryVariablesProps = {
  search?: string
  page: number
  first?: number
  currentUser: MeUserFragment | null | undefined
}

export function getUsersQueryVariables({
  currentUser,
  page,
  search,
  first = 10,
}: getUsersQueryVariablesProps): UsersConnectionQueryVariables {
  return {
    where: { search, status: currentUser ? undefined : UserStatusEnum.ACTIVE },
    skip: (page - 1) * first,
    first,
  }
}
