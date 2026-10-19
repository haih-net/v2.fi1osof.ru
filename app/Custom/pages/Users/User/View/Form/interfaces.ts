import type { CurrentUserUpdateInput } from 'app/gql/generated'
export type UserFormData = CurrentUserUpdateInput
export function validateUserForm(data: UserFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (data.username && !/^[a-zA-Z0-9_-]{3,64}$/.test(data.username)) {
    errors.username =
      'Логин: от 3 до 64 латинских букв, цифр, дефисов или подчёркиваний'
  }
  return errors
}
