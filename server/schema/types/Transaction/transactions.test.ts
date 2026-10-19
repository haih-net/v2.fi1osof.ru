import { createRequire } from 'node:module'
import type { Request } from 'express'
import type { Knex } from 'knex'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase } from '../../../database'
import { schema } from '../../index'
import type { Context } from '../../builder'
import type { UserRecord } from '../User/interfaces'
import { createTransfer } from './resolvers/createTransfer'
import { creditTopUp } from '../Balance/resolvers/topUp'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')
let db: Knex
let sender: UserRecord
let receiver: UserRecord
const context = (user: UserRecord | null): Context => ({
  db,
  dbOld: db,
  currentUser: user,
  req: {} as Request,
})
beforeEach(async () => {
  db = createDatabase()
  ;[sender, receiver] = await db<UserRecord>('User')
    .insert([{ id: 'sender' }, { id: 'receiver' }])
    .returning('*')
  await creditTopUp(context(sender), 42161, 'initial-payment', 10)
})
afterEach(async () => {
  await db.destroy()
})

describe('Balance and transaction integrity', () => {
  it('transfers atomically, links counterparties and exposes only own history', async () => {
    await createTransfer(
      { toUserId: receiver.id, amount: 2.5, title: 'test' },
      context(sender),
    )
    expect(
      (await db('Balance').where('userId', sender.id).first()).amount,
    ).toBe(7.5)
    expect(
      (await db('Balance').where('userId', receiver.id).first()).amount,
    ).toBe(2.5)
    const result = await graphql({
      schema,
      source:
        '{ myTransactionsCount myTransactions { type amount Parent { User { id } } } }',
      contextValue: context(receiver),
    })
    expect(result.errors).toBeUndefined()
    expect(result.data).toMatchObject({
      myTransactionsCount: 1,
      myTransactions: [
        {
          type: 'TransferIn',
          amount: 2.5,
          Parent: { User: { id: sender.id } },
        },
      ],
    })
    const anonymous = await graphql({
      schema,
      source: '{myTransactionsCount}',
      contextValue: context(null),
    })
    expect(anonymous.errors).toHaveLength(1)
  })
  it('prevents concurrent overdrafts and rolls back invalid recipients', async () => {
    const results = await Promise.allSettled([
      createTransfer({ toUserId: receiver.id, amount: 7 }, context(sender)),
      createTransfer({ toUserId: receiver.id, amount: 7 }, context(sender)),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    await expect(
      createTransfer({ toUserId: 'missing', amount: 1 }, context(sender)),
    ).rejects.toThrow()
    expect(
      (await db('Balance').where('userId', sender.id).first()).amount,
    ).toBe(3)
    expect(
      (await db('Balance').where('userId', receiver.id).first()).amount,
    ).toBe(7)
    expect(await db('Transaction')).toHaveLength(3)
  })
  it('rejects replayed top-ups without increasing balance or leaving ledger entries', async () => {
    await expect(
      creditTopUp(context(sender), 42161, 'INITIAL-PAYMENT', 10),
    ).rejects.toThrow()
    expect(
      (await db('Balance').where('userId', sender.id).first()).amount,
    ).toBe(10)
    expect(await db('Transaction')).toHaveLength(1)
  })
})
