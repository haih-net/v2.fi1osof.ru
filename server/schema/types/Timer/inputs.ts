import { builder } from '../../builder'

export const TimerCreate = builder.inputType('TimerCreateInput', {
  fields: (t) => ({
    taskId: t.string({ required: true }),
    startedAt: t.field({ type: 'DateTime' }),
  }),
})
export const TimerUpdate = builder.inputType('TimerUpdateDataInput', {
  fields: (t) => ({
    startedAt: t.field({ type: 'DateTime' }),
    stoppedAt: t.field({ type: 'DateTime' }),
  }),
})
