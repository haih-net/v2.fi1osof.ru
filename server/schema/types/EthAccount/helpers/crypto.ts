import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { getAddress, verifyMessage } from 'ethers'
import type { Knex } from 'knex'
import { jwtSecret } from '../../User/helpers/auth'
import type { TokenRecord } from '../../User/interfaces'

export function normalizeAddress(address: string): string {
  return getAddress(address).toLowerCase()
}

export async function generateNonce(
  address: string,
  dbOld: Knex,
): Promise<string> {
  const normalizedAddress = normalizeAddress(address)
  const tokenId = randomUUID()
  const nonce = jwt.sign(
    { address: normalizedAddress, tokenId, type: 'EthNonce' },
    jwtSecret(),
    { algorithm: 'HS256', expiresIn: '5m' },
  )
  await dbOld<TokenRecord>('Token').insert({
    id: tokenId,
    userId: null,
    createdAt: new Date(),
    expiredAt: new Date(Date.now() + 5 * 60 * 1000),
  })
  return nonce
}

export function verifyNonce(nonce: string, address: string): string | null {
  try {
    const payload = jwt.verify(nonce, jwtSecret(), { algorithms: ['HS256'] })
    if (
      typeof payload === 'string' ||
      payload.type !== 'EthNonce' ||
      payload.address !== normalizeAddress(address) ||
      typeof payload.tokenId !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    return payload.tokenId
  } catch {
    return null
  }
}

export function verifySignature(
  message: string,
  signature: string,
  address: string,
): boolean {
  try {
    return (
      verifyMessage(message, signature).toLowerCase() ===
      normalizeAddress(address)
    )
  } catch {
    return false
  }
}

export function buildSignMessage(nonce: string): string {
  return `Подпишите это сообщение для входа на сайт «Городские бани»:\n${nonce}`
}
