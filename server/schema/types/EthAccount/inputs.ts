import { builder } from '../../builder'

export const EthAccountAuthInput = builder.inputType('EthAccountAuthInput', {
  fields: (t) => ({
    address: t.string({ required: true }),
    signature: t.string({ required: true }),
    nonce: t.string({ required: true }),
    referrerToken: t.string(),
  }),
})

export const EthAccountNoncePayload = builder.simpleObject(
  'EthAccountNoncePayload',
  {
    fields: (t) => ({ nonce: t.string(), message: t.string() }),
  },
)

export const EthAccountAuthPayload = builder.simpleObject(
  'EthAccountAuthPayload',
  {
    fields: (t) => ({
      success: t.boolean(),
      message: t.string({ nullable: true }),
      token: t.string({ nullable: true }),
    }),
  },
)
