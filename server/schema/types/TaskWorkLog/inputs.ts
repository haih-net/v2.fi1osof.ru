import { builder } from '../../builder'

export const WorkLogCreate = builder.inputType('TaskWorkLogCreateInput', {
  fields: (t) => ({
    taskId: t.string({ required: true }),
    content: t.string({ required: true }),
  }),
})
export const WorkLogUpdate = builder.inputType('TaskWorkLogUpdateInput', {
  fields: (t) => ({ content: t.string() }),
})
