import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { builder } from '../../../builder'
import { jwtSecret } from '../helpers/auth'
import type { TokenRecord } from '../interfaces'

builder.mutationField('createReferrerToken', (t) =>
  t.string({
    authScopes: { active: true },
    nullable: false,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.currentUser) {
        throw new Error('Доступ запрещён')
      }
      const id = randomUUID()
      const token = jwt.sign(
        { userId: ctx.currentUser.id, tokenId: id, type: 'Referrer' },
        jwtSecret(),
        {
          algorithm: 'HS256',
          expiresIn: (process.env.REFERRER_TOKEN_TTL ||
            '1h') as jwt.SignOptions['expiresIn'],
        },
      )
      const payload = jwt.decode(token)
      if (!payload || typeof payload === 'string' || !payload.exp) {
        throw new Error('Некорректный срок приглашения')
      }
      await ctx.dbOld<TokenRecord>('Token').insert({
        id,
        userId: ctx.currentUser.id,
        createdAt: new Date(),
        expiredAt: new Date(payload.exp * 1000),
      })
      return token
    },
  }),
)
