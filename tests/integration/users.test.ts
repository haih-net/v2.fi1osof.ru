import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { beforeEach, afterEach, afterAll, describe, expect, it } from 'vitest'
import type { ExecutionResult } from 'graphql'
import graphqlModule from 'graphql/index.js'
const { graphql } = graphqlModule
import type { Request } from 'express'
import type { Knex } from 'knex'
import jwt from 'jsonwebtoken'
import { dbOld } from '../../server/database_old'
import { schema } from '../../server/schema'
import { createContext } from '../../server/context'
import {
  authenticate,
  createToken,
  hashPassword,
  comparePassword,
} from '../../server/schema/types/User/helpers/auth'
import type { UserRecord } from '../../server/schema/types/User/interfaces'

let trx: Knex.Transaction
let owner: UserRecord
let admin: UserRecord
let blocked: UserRecord
let hash: string
const password = 'test-password-123'

function testSecret(): string {
  assert.ok(process.env.JWT_SECRET)
  return process.env.JWT_SECRET
}

async function run(
  query: string,
  variables: Record<string, unknown> = {},
  user: UserRecord | null = null,
): Promise<ExecutionResult> {
  return graphql({
    schema,
    source: query,
    variableValues: variables,
    contextValue: { req: { headers: {} }, dbOld: trx, currentUser: user },
  })
}
const signin =
  'mutation($where: UserWhereUniqueInput!, $data: UserSigninDataInput!) { signin(where: $where, data: $data) { success message token } }'

beforeEach(async () => {
  trx = await dbOld.transaction()
  hash ??= await hashPassword(password)
  const rows = await trx<UserRecord>('User')
    .insert([
      {
        id: randomUUID(),
        username: `owner-${randomUUID()}`,
        email: `${randomUUID()}@example.test`,
        fullname: 'MixedCase Test',
        password: hash,
        status: 'active' as const,
        sudo: false,
      },
      {
        id: randomUUID(),
        username: `admin-${randomUUID()}`,
        password: hash,
        status: 'active' as const,
        sudo: true,
      },
      {
        id: randomUUID(),
        username: `blocked-${randomUUID()}`,
        password: hash,
        status: 'blocked' as const,
        sudo: false,
      },
    ])
    .returning('*')
  ;[owner, admin, blocked] = rows
})
afterEach(async () => {
  await trx?.rollback()
})
afterAll(async () => {
  await dbOld.destroy()
})

describe('Пользователи и авторизация через Knex', () => {
  it('входит по email, username и id; сохраняет JWT и возвращает me через Bearer', async () => {
    for (const key of ['email', 'username', 'id'] as const) {
      const result = await run(signin, {
        where: { [key]: owner[key] },
        data: { password },
      })
      expect(result.errors).toBeUndefined()
      const auth = result.data?.signin as { success: boolean; token: string }
      expect(auth.success).toBe(true)
      const req = {
        headers: { authorization: `Bearer ${auth.token}` },
      } as Request
      const context = await createContext(req, trx)
      expect(context.currentUser?.id).toBe(owner.id)
      const me = await graphql({
        schema,
        source: '{ me { id email } }',
        contextValue: context,
      })
      expect(me.data?.me).toEqual({ id: owner.id, email: owner.email })
      const payload = jwt.verify(auth.token, testSecret()) as jwt.JwtPayload
      expect(payload.type).toBe('Auth')
      expect(
        await trx('Token').where('id', payload.tokenId).first(),
      ).toMatchObject({ userId: owner.id })
    }
  })

  it('возвращает ошибки входа без создания токенов', async () => {
    const before = await trx('Token').count('* as count').first()
    for (const [where, suppliedPassword, message] of [
      [{}, password, 'Email, username or id required'],
      [{ id: randomUUID() }, password, 'User not found'],
      [{ id: owner.id }, 'wrong', 'Invalid password'],
    ] as const) {
      const result = await run(signin, {
        where,
        data: { password: suppliedPassword },
      })
      expect(result.data?.signin).toEqual({
        success: false,
        token: null,
        message,
      })
    }
    await trx('User').where('id', owner.id).update({ password: null })
    const result = await run(signin, {
      where: { id: owner.id },
      data: { password },
    })
    expect(result.data?.signin).toMatchObject({
      success: false,
      message: 'Password not set',
    })
    expect(await trx('Token').count('* as count').first()).toEqual(before)
  })

  it('отвергает поддельные, просроченные, удалённые и чужие токены', async () => {
    const token = await createToken(owner, trx)
    const payload = jwt.decode(token) as jwt.JwtPayload
    const sign = (extra: Record<string, unknown>) =>
      jwt.sign(
        { userId: owner.id, tokenId: payload.tokenId, type: 'Auth', ...extra },
        testSecret(),
      )
    expect(await authenticate(`${token}x`, trx)).toBeNull()
    expect(await authenticate(sign({ type: 'Referrer' }), trx)).toBeNull()
    expect(await authenticate(sign({ userId: admin.id }), trx)).toBeNull()
    expect(
      await authenticate(sign({ exp: Math.floor(Date.now() / 1000) - 1 }), trx),
    ).toBeNull()
    expect(await authenticate(sign({ tokenId: 123 }), trx)).toBeNull()
    await trx('Token')
      .where('id', payload.tokenId)
      .update({ expiredAt: new Date(0) })
    expect(await authenticate(token, trx)).toBeNull()
    await trx('Token').where('id', payload.tokenId).delete()
    expect(await authenticate(token, trx)).toBeNull()
  })

  it('принимает старый формат токена, me для гостя равен null', async () => {
    const tokenId = randomUUID()
    await trx('Token').insert({ id: tokenId, userId: owner.id })
    const legacyToken = jwt.sign(
      { userId: owner.id, type: 'Auth', tokenId },
      testSecret(),
    )
    expect((await authenticate(legacyToken, trx))?.id).toBe(owner.id)
    expect((await run('{ me { id } }')).data?.me).toBeNull()
  })

  it('защищает email и связанные записи от гостя и другого пользователя', async () => {
    await trx('EthAccount').insert({
      id: randomUUID(),
      userId: owner.id,
      address: `0x${randomUUID().replaceAll('-', '')}`,
    })
    await trx('TelegramAccount').insert({
      id: randomUUID(),
      userId: owner.id,
      externalKey: randomUUID(),
    })
    await trx('Balance').insert({
      id: randomUUID(),
      userId: owner.id,
      amount: 12,
    })
    const query =
      'query($where: UserWhereUniqueInput!) { user(where: $where) { email EthAccount { id } TelegramAccount { id } Balance { amount } } }'
    for (const user of [null, admin]) {
      const result = await run(query, { where: { id: owner.id } }, user)
      expect(result.errors).toBeUndefined()
      expect(result.data?.user).toEqual({
        email: null,
        EthAccount: null,
        TelegramAccount: null,
        Balance: null,
      })
    }
    const own = await run(query, { where: { id: owner.id } }, owner)
    expect(own.errors).toBeUndefined()
    expect(own.data?.user).toMatchObject({
      email: owner.email,
      Balance: { amount: 12 },
    })
  })

  it('сохраняет правила видимости статусов оригинала', async () => {
    const query =
      'query($where: UserWhereInput) { users(where: $where) { id } usersCount(where: $where) }'
    expect((await run(query, { where: { id: blocked.id } })).data).toEqual({
      users: [],
      usersCount: 0,
    })
    for (const current of [blocked, admin]) {
      expect(
        (await run(query, { where: { id: blocked.id } }, current)).data,
      ).toEqual({ users: [{ id: blocked.id }], usersCount: 1 })
    }
    expect(
      (await run(query, { where: { id: blocked.id, status: 'blocked' } })).data
        ?.usersCount,
    ).toBe(1)
  })

  it('применяет строковые фильтры, вложенное not и пагинацию', async () => {
    const query =
      'query($where: UserWhereInput, $skip: Int, $take: Int) { users(where: $where, skip: $skip, take: $take) { id } usersCount(where: $where) }'
    for (const fullname of [
      { equals: 'mixedcase test', mode: 'insensitive' },
      { contains: 'case', mode: 'insensitive' },
      { startsWith: 'Mixed', endsWith: 'Test' },
      { in: ['MixedCase Test'], notIn: ['other'] },
      { gt: 'A', gte: 'A', lt: 'Z', lte: 'Z' },
      { not: { not: { equals: 'MixedCase Test' } } },
    ]) {
      const result = await run(query, {
        where: { id: owner.id, fullname },
        take: 1,
      })
      expect(result.errors).toBeUndefined()
      expect(result.data).toEqual({ users: [{ id: owner.id }], usersCount: 1 })
    }
    expect(
      (await run(query, { where: { id: owner.id }, skip: 1 })).data?.users,
    ).toEqual([])
    expect(
      (await run(query, { where: { id: owner.id }, take: 0 })).data?.users,
    ).toEqual([])
    expect((await run(query, { take: -1 })).errors?.[0].extensions.code).toBe(
      'BAD_USER_INPUT',
    )
    expect(
      (
        await run(query, {
          where: { id: owner.id, fullname: { contains: "' OR 1=1 --" } },
        })
      ).data?.usersCount,
    ).toBe(0)
    expect(
      (
        await run(query, {
          where: { id: admin.id, fullname: { equals: null } },
        })
      ).data?.usersCount,
    ).toBe(1)
    expect(
      (await run(query, { where: { id: owner.id, fullname: { in: [] } } })).data
        ?.usersCount,
    ).toBe(0)
  })

  it('обновляет свой профиль, проверяет MDX и bcrypt, не открывает sudo', async () => {
    const query =
      'mutation($data: CurrentUserUpdateInput!) { updateCurrentUser(data: $data) { id fullname content isAiAgent } }'
    expect(
      (await run(query, { data: { fullname: 'No' } })).errors?.[0].extensions
        .code,
    ).toBe('UNAUTHENTICATED')
    expect(
      (await run(query, { data: { content: '<Unclosed' } }, owner)).errors?.[0]
        .extensions.code,
    ).toBe('BAD_USER_INPUT')
    const result = await run(
      query,
      {
        data: {
          fullname: 'Updated',
          content: '# Hello',
          password: 'new-password',
          isAiAgent: true,
        },
      },
      owner,
    )
    expect(result.errors).toBeUndefined()
    const updated = await trx<UserRecord>('User').where('id', owner.id).first()
    expect(updated?.fullname).toBe('Updated')
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      owner.updatedAt.getTime(),
    )
    assert.ok(updated?.password)
    expect(await comparePassword('new-password', updated.password)).toBe(true)
    expect(updated?.sudo).toBe(false)
    expect(
      (await run(query, { data: { sudo: true } }, owner)).errors,
    ).toBeDefined()
    await run(
      query,
      { data: { fullname: null, password: '', isAiAgent: null } },
      owner,
    )
    const cleared = await trx<UserRecord>('User').where('id', owner.id).first()
    expect(cleared?.fullname).toBeNull()
    expect(cleared?.password).toBe(updated?.password)
    expect(cleared?.isAiAgent).toBe(true)
  })

  it('разрешает updateUser только sudo, запрещает изменение себя', async () => {
    const query =
      'mutation($where: UserWhereUniqueInput!, $data: UserUpdateDataInput!) { updateUser(where: $where, data: $data) { id status } }'
    const variables = {
      where: { id: owner.id },
      data: { status: 'blocked', password: 'admin-reset' },
    }
    for (const actor of [null, owner]) {
      expect(
        (await run(query, variables, actor)).errors?.[0].extensions.code,
      ).toBe('FORBIDDEN')
    }
    expect(
      (await run(query, { ...variables, where: { id: admin.id } }, admin))
        .errors?.[0].extensions.code,
    ).toBe('FORBIDDEN')
    expect(
      (await run(query, { ...variables, where: { email: owner.email } }, admin))
        .errors?.[0].extensions.code,
    ).toBe('BAD_USER_INPUT')
    const result = await run(query, variables, admin)
    expect(result.errors).toBeUndefined()
    expect(result.data?.updateUser).toEqual({ id: owner.id, status: 'blocked' })
    const updated = await trx<UserRecord>('User').where('id', owner.id).first()
    assert.ok(updated?.password)
    expect(await comparePassword('admin-reset', updated.password)).toBe(true)
  })

  it('не предоставляет регистрацию, реферальные токены и поле password', async () => {
    expect(schema.getMutationType()?.getFields().signup).toBeUndefined()
    expect(
      schema.getMutationType()?.getFields().createReferrerToken,
    ).toBeUndefined()
    expect((await run('{ users { password } }')).errors).toBeDefined()
    expect(
      (await run('query { user(where: {}) { id } }')).errors?.[0].extensions
        .code,
    ).toBe('BAD_USER_INPUT')
  })
})
