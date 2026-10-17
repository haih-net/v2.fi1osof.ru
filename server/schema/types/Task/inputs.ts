import { builder } from '../../builder'

export const TaskStatus = builder.enumType('TaskStatusEnum', {
  values: {
    NEW: { value: 'New' },
    PROGRESS: { value: 'Progress' },
    DONE: { value: 'Done' },
    REJECTED: { value: 'Rejected' },
  },
})
export const TaskCreate = builder.inputType('TaskCreateInput', {
  fields: (t) => ({
    title: t.string({ required: true }),
    description: t.string(),
    content: t.string(),
    projectId: t.string(),
    parentId: t.string(),
    assigneeId: t.string(),
    startDatePlaning: t.field({ type: 'DateTime' }),
    endDatePlaning: t.field({ type: 'DateTime' }),
  }),
})
export const TaskUpdate = builder.inputType('TaskUpdateInput', {
  fields: (t) => ({
    title: t.string(),
    description: t.string(),
    content: t.string(),
    projectId: t.string(),
    assigneeId: t.string(),
    status: t.field({ type: TaskStatus }),
    startDatePlaning: t.field({ type: 'DateTime' }),
    endDatePlaning: t.field({ type: 'DateTime' }),
    startDate: t.field({ type: 'DateTime' }),
    endDate: t.field({ type: 'DateTime' }),
  }),
})
export const TaskWhere = builder.inputType('SiteTaskWhereInput', {
  fields: (t) => ({
    status: t.string(),
    projectId: t.string(),
    incompletedOnly: t.boolean(),
  }),
})
