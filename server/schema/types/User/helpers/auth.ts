import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Knex } from 'knex'
import type { TokenRecord, UserRecord } from '../interfaces'

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET env is empty')
  }
  return secret
}

export async function createToken(user: UserRecord, db: Knex): Promise<string> {
  const id = randomUUID()
  const token = jwt.sign(
    { userId: user.id, type: 'Auth', tokenId: id },
    jwtSecret(),
    { algorithm: 'HS256' },
  )
  await db<TokenRecord>('Token').insert({
    id,
    userId: user.id,
    createdAt: new Date(),
    expiredAt: null,
  })
  return token
}

export async function authenticate(
  token: string,
  db: Knex,
): Promise<UserRecord | null> {
  const secret = jwtSecret()
  let payload: jwt.JwtPayload | string
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
  } catch {
    return null
  }
  if (
    typeof payload === 'string' ||
    payload.type !== 'Auth' ||
    typeof payload.tokenId !== 'string' ||
    typeof payload.userId !== 'string'
  ) {
    return null
  }
  const stored = await db<TokenRecord>('Token')
    .where({ id: payload.tokenId, userId: payload.userId })
    .first()
  if (
    !stored ||
    (stored.expiredAt && stored.expiredAt.getTime() <= Date.now())
  ) {
    return null
  }
  return (
    (await db<UserRecord>('User').where({ id: payload.userId }).first()) ?? null
  )
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
