import { builder } from '../../builder'
import { UserStatusEnum } from './inputs'
import type { UserRecord } from './interfaces'

interface EthAccountRecord {
  id: string
  createdAt: Date
  address: string
  userId: string | null
}
interface TelegramAccountRecord {
  id: string
  createdAt: Date
  photo_url: string | null
  username: string | null
  userId: string
}
interface BalanceRecord {
  id: string
  createdAt: Date
  updatedAt: Date
  amount: number
  userId: string
}

const EthAccount = builder.objectRef<EthAccountRecord>('EthAccount').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    address: t.exposeString('address'),
    userId: t.exposeString('userId', { nullable: true }),
  }),
})
const TelegramAccount = builder
  .objectRef<TelegramAccountRecord>('TelegramAccount')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      createdAt: t.expose('createdAt', { type: 'DateTime' }),
      photo_url: t.exposeString('photo_url', { nullable: true }),
      username: t.exposeString('username', { nullable: true }),
      userId: t.exposeID('userId'),
    }),
  })
const Balance = builder.objectRef<BalanceRecord>('Balance').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    amount: t.exposeFloat('amount'),
    userId: t.exposeString('userId'),
  }),
})
export const User = builder.objectRef<UserRecord>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    email: t.string({
      nullable: true,
      resolve: (user, _args, ctx) =>
        user.id === ctx.currentUser?.id ? user.email : null,
    }),
    image: t.exposeString('image'),
    content: t.exposeString('content'),
    intro: t.exposeString('intro'),
    username: t.exposeString('username', { nullable: true }),
    fullname: t.exposeString('fullname', { nullable: true }),
    sudo: t.exposeBoolean('sudo', { nullable: true }),
    isAiAgent: t.exposeBoolean('isAiAgent', { nullable: false }),
    status: t.field({
      type: UserStatusEnum,
      nullable: false,
      resolve: (user) => user.status,
    }),
    EthAccount: t.field({
      type: EthAccount,
      nullable: true,
      resolve: async (user, _args, ctx) =>
        user.id === ctx.currentUser?.id
          ? ((await ctx
              .db<EthAccountRecord>('EthAccount')
              .where('userId', user.id)
              .first()) ?? null)
          : null,
    }),
    TelegramAccount: t.field({
      type: TelegramAccount,
      nullable: true,
      resolve: async (user, _args, ctx) =>
        user.id === ctx.currentUser?.id
          ? ((await ctx
              .db<TelegramAccountRecord>('TelegramAccount')
              .where('userId', user.id)
              .first()) ?? null)
          : null,
    }),
    Balance: t.field({
      type: Balance,
      nullable: true,
      resolve: async (user, _args, ctx) =>
        user.id === ctx.currentUser?.id
          ? ((await ctx
              .db<BalanceRecord>('Balance')
              .where('userId', user.id)
              .first()) ?? null)
          : null,
    }),
  }),
})
