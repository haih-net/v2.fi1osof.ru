import { builder } from '../../../builder'
import { AuthPayload, UserSignupDataInput } from '../inputs'

builder.mutationField('signup', (t) =>
  t.field({
    type: AuthPayload,
    args: { data: t.arg({ type: UserSignupDataInput, required: true }) },
    resolve: () => {
      throw new Error('Еще не реализовано')
    },
  }),
)
