import { randomUUID } from 'node:crypto'
import type { Knex } from 'knex'
import type { UserCreateDataInput } from '../inputs'
import type { UserRecord, UserStatus } from '../interfaces'
import { validateRegistration } from './validateRegistration'
import { profileChanges } from './profileChanges'

export async function insertUser(
  db: Knex,
  data: typeof UserCreateDataInput.$inferInput,
  referrerId: string | null = null,
): Promise<UserRecord> {
  const { email: rawEmail, status: requestedStatus, sudo, ...profile } = data
  const username = data.username?.trim() || null
  const email = rawEmail?.trim() || null
  const error = validateRegistration({
    username,
    email,
    password: data.password,
  })
  if (error) {
    throw new Error(error)
  }
  const status =
    requestedStatus ?? (process.env.USER_DEFAULT_STATUS || 'active')
  if (!['active', 'newbie', 'blocked'].includes(status)) {
    throw new Error('Некорректный USER_DEFAULT_STATUS')
  }
  const changes = await profileChanges(profile)
  try {
    const [user] = await db<UserRecord & { referrerId: string | null }>('User')
      .insert({
        ...changes,
        id: randomUUID(),
        username,
        email,
        fullname: data.fullname?.trim() || null,
        status: status as UserStatus,
        referrerId,
        sudo: sudo ?? false,
        isAiAgent: data.isAiAgent ?? false,
        createdAt: new Date(),
      })
      .returning('*')
    return user
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: User.username')
    ) {
      throw new Error('Логин уже занят')
    }
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: User.email')
    ) {
      throw new Error('Электронная почта уже зарегистрирована')
    }
    throw error
  }
}
