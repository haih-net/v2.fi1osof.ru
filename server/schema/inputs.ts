import { builder } from './builder'

export const Unique = builder.inputType('SiteObjectWhereUniqueInput', {
  fields: (t) => ({ id: t.string(), uri: t.string() }),
})
