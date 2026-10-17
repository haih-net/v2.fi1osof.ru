import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import type { Knex } from 'knex'
import { createDatabase } from '../../../database'
import jwt from 'jsonwebtoken'
import { Wallet } from 'ethers'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { Request } from 'express'
import { schema } from '../../index'
import type { Context } from '../../builder'
import { authenticate } from '../User/helpers/auth'
import type { UserRecord } from '../User/interfaces'
import { authEthAccount } from './resolvers/authEthAccount'
import { generateNonce, buildSignMessage } from './helpers/crypto'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')
const secret = 'isolated-ethereum-auth-test-secret'
let db: Knex
const wallet = Wallet.createRandom()

async function addUser(): Promise<UserRecord> {
  const [user] = await db<UserRecord>('User')
    .insert({ id: randomUUID() })
    .returning('*')
  return user
}
async function challenge(signer = wallet) {
  const nonce = await generateNonce(signer.address, db)
  return {
    address: signer.address,
    nonce,
    signature: await signer.signMessage(buildSignMessage(nonce)),
  }
}
function context(currentUser: UserRecord | null = null): Context {
  return { db, currentUser, req: {} as Request }
}
async function referral(userId: string, expired = false): Promise<string> {
  const id = randomUUID()
  await db('Token').insert({
    id,
    userId,
    expiredAt: expired ? new Date(0) : null,
  })
  return jwt.sign({ tokenId: id, userId, type: 'Referrer' }, secret, {
    expiresIn: '1h',
  })
}

describe('Ethereum authentication against SQLite', () => {
  beforeAll(async () => {
    db = createDatabase()
    await db.raw('SELECT 1')
  })
  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', secret)
    vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', '')
    await db('EthAccount').delete()
    await db('Token').delete()
    await db('User').delete()
  })
  afterEach(() => vi.unstubAllEnvs())
  afterAll(async () => {
    await db?.destroy()
  })

  it('issues a challenge through GraphQL and rejects malformed addresses', async () => {
    const result = await graphql({
      schema,
      source:
        'mutation($address:String!){ethAccountNonce(address:$address){nonce message}}',
      variableValues: { address: wallet.address },
      contextValue: context(),
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.ethAccountNonce).toMatchObject({
      nonce: expect.any(String),
      message: expect.stringContaining('Городские бани'),
    })
    const invalid = await graphql({
      schema,
      source: 'mutation{ethAccountNonce(address:"invalid"){nonce}}',
      contextValue: context(),
    })
    expect(invalid.errors?.[0].message).toBe('Некорректный адрес Ethereum')
  })

  it('signs in an existing wallet while registration is restricted', async () => {
    const user = await addUser()
    await db('EthAccount').insert({
      id: randomUUID(),
      address: wallet.address.toLowerCase(),
      userId: user.id,
    })
    const result = await authEthAccount(await challenge(), context())
    expect(result.success).toBe(true)
    expect(await authenticate(result.token ?? '', db)).toMatchObject({
      id: user.id,
    })
    expect(await db('User')).toHaveLength(1)
  })

  it('rejects a new wallet without an invitation through GraphQL without creating records', async () => {
    const result = await graphql({
      schema,
      source:
        'mutation($data:EthAccountAuthInput!){authEthAccount(data:$data){success token}}',
      variableValues: { data: await challenge() },
      contextValue: context(),
    })
    expect(result.errors?.[0].message).toBe(
      'Для регистрации требуется токен приглашения',
    )
    expect(await db('User')).toHaveLength(0)
    expect(await db('EthAccount')).toHaveLength(0)
  })

  it('creates a user with the invitation owner as referrer', async () => {
    const owner = await addUser()
    const result = await authEthAccount(
      { ...(await challenge()), referrerToken: await referral(owner.id) },
      context(),
    )
    expect(result.success).toBe(true)
    const account = await db('EthAccount').first()
    expect(
      await db('User').where({ id: account.userId }).first(),
    ).toMatchObject({ referrerId: owner.id })
  })

  it('permits new wallets only when open registration is explicitly enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', 'ANY')
    expect((await authEthAccount(await challenge(), context())).success).toBe(
      true,
    )
    expect(await db('User')).toHaveLength(1)
    expect(await db('EthAccount')).toHaveLength(1)
  })

  it.each(['invalid', 'expired', 'revoked', 'auth'])(
    'rejects a %s referral even in open registration mode',
    async (mode) => {
      vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', 'ANY')
      const owner = await addUser()
      let token = await referral(owner.id, mode === 'expired')
      if (mode === 'invalid') {
        token += 'broken'
      }
      if (mode === 'revoked') {
        await db('Token').delete()
      }
      if (mode === 'auth') {
        const decoded = jwt.decode(token) as jwt.JwtPayload
        token = jwt.sign(
          { tokenId: decoded.tokenId, userId: owner.id, type: 'Auth' },
          secret,
        )
      }
      await expect(
        authEthAccount(
          { ...(await challenge()), referrerToken: token },
          context(),
        ),
      ).rejects.toThrow(
        'Приглашение недействительно или срок его действия истёк',
      )
      expect(await db('User')).toHaveLength(1)
      expect(await db('EthAccount')).toHaveLength(0)
    },
  )

  it('rejects a signature from another wallet', async () => {
    const data = await challenge()
    data.signature = await Wallet.createRandom().signMessage(
      buildSignMessage(data.nonce),
    )
    expect(await authEthAccount(data, context())).toMatchObject({
      success: false,
      message: 'Недействительная подпись',
    })
    expect(await db('User')).toHaveLength(0)
  })

  it('rejects expired challenges and challenges for another address', async () => {
    const data = await challenge()
    expect(
      (
        await authEthAccount(
          { ...data, address: Wallet.createRandom().address },
          context(),
        )
      ).success,
    ).toBe(false)
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(Date.now() + 6 * 60 * 1000)
      expect(await authEthAccount(data, context())).toMatchObject({
        success: false,
        message: 'Одноразовый код недействителен или срок его действия истёк',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('consumes a challenge once even for concurrent requests', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', 'ANY')
    const data = await challenge()
    const results = await Promise.all([
      authEthAccount(data, context()),
      authEthAccount(data, context()),
    ])
    expect(results.filter((result) => result.success)).toHaveLength(1)
    expect(await db('User')).toHaveLength(1)
    expect(await db('Token').whereNotNull('userId')).toHaveLength(1)
    expect((await authEthAccount(data, context())).success).toBe(false)
  })

  it('creates only one user for concurrent first sign-ins with different challenges', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_SIGNUP_STRATEGY', 'ANY')
    const data = await Promise.all([challenge(), challenge()])
    const results = await Promise.all(
      data.map((item) => authEthAccount(item, context())),
    )
    expect(results.every((result) => result.success)).toBe(true)
    expect(await db('User')).toHaveLength(1)
    expect(await db('EthAccount')).toHaveLength(1)
  })

  it('links a new wallet to the current user without requiring registration', async () => {
    const user = await addUser()
    const result = await authEthAccount(await challenge(), context(user))
    expect(result.success).toBe(true)
    expect(await db('EthAccount').first()).toMatchObject({ userId: user.id })
    expect(await db('User')).toHaveLength(1)
  })

  it('does not reassign a wallet owned by another user', async () => {
    const owner = await addUser()
    const other = await addUser()
    await db('EthAccount').insert({
      id: randomUUID(),
      address: wallet.address.toLowerCase(),
      userId: owner.id,
    })
    expect(
      await authEthAccount(await challenge(), context(other)),
    ).toMatchObject({
      success: false,
      message: 'Кошелёк привязан к другой учётной записи',
    })
    expect(await db('EthAccount').first()).toMatchObject({ userId: owner.id })
  })
})
