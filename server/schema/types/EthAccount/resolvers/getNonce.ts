import { builder } from '../../../builder'
import { EthAccountNoncePayload } from '../inputs'
import {
  generateNonce,
  buildSignMessage,
  normalizeAddress,
} from '../helpers/crypto'

builder.mutationField('ethAccountNonce', (t) =>
  t.field({
    type: EthAccountNoncePayload,
    args: { address: t.arg.string({ required: true }) },
    resolve: async (_root, { address }, ctx) => {
      try {
        normalizeAddress(address)
      } catch {
        throw new Error('Некорректный адрес Ethereum')
      }
      const nonce = await generateNonce(address, ctx.dbOld)
      return { nonce, message: buildSignMessage(nonce) }
    },
  }),
)
