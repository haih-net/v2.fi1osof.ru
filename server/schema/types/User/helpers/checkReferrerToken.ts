import jwt from 'jsonwebtoken'
import type { Knex } from 'knex'
import { jwtSecret } from './auth'
import type { TokenRecord, UserRecord } from '../interfaces'

export async function checkReferrerToken(
  referrerToken: string | null | undefined,
  db: Knex,
): Promise<string | null> {
  if (!referrerToken) {
    if (process.env.NEXT_PUBLIC_SITE_SIGNUP_STRATEGY !== 'ANY') {
      throw new Error('Для регистрации требуется токен приглашения')
    }
    return null
  }
  let payload: jwt.JwtPayload | string
  try {
    payload = jwt.verify(referrerToken, jwtSecret(), { algorithms: ['HS256'] })
  } catch {
    throw new Error('Приглашение недействительно или срок его действия истёк')
  }
  if (
    typeof payload === 'string' ||
    payload.type !== 'Referrer' ||
    typeof payload.userId !== 'string' ||
    typeof payload.tokenId !== 'string'
  ) {
    throw new Error('Приглашение недействительно или срок его действия истёк')
  }
  const token = await db<TokenRecord>('Token')
    .where({ id: payload.tokenId, userId: payload.userId })
    .first()
  if (
    !token ||
    (token.expiredAt && token.expiredAt.getTime() <= Date.now()) ||
    !(await db<UserRecord>('User').where({ id: payload.userId }).first())
  ) {
    throw new Error('Приглашение недействительно или срок его действия истёк')
  }
  return payload.userId
}
