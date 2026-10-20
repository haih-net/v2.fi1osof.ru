import { builder } from '../../builder'

export const ProjectCreate = builder.inputType('ProjectCreateInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string(),
    intro: t.string(),
    content: t.string(),
    image: t.string(),
    commercial: t.boolean({ required: true }),
  }),
})
export const ProjectUpdate = builder.inputType('ProjectUpdateInput', {
  fields: (t) => ({
    name: t.string(),
    description: t.string(),
    intro: t.string(),
    content: t.string(),
    image: t.string(),
    commercial: t.boolean(),
  }),
})
