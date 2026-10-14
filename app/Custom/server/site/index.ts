import { registerSiteMutations } from './mutations'
import type { Knex } from 'knex'
import { GraphQLError } from 'graphql'
import { builder, type Context } from '../../../../server/schema/builder'
import { User } from '../../../../server/schema/types/User/types'
import type { UserRecord } from '../../../../server/schema/types/User/interfaces'

interface RecordBase {
  id: string
  createdAt: Date
  updatedAt: Date
  createdById: string
  en?: Record<string, unknown> | null
  vi?: Record<string, unknown> | null
}
interface ContentRecord extends RecordBase {
  name: string
  description: string | null
  intro: string | null
  content: string | null
  image: string | null
}
interface ConceptRecord extends ContentRecord {
  uri: string | null
  visibility: string
}
interface ProjectRecord extends ContentRecord {
  commercial: boolean
  status: string | null
}
export interface TaskRecord extends RecordBase {
  title: string
  description: string | null
  content: string | null
  status: string
  projectId: string | null
  assigneeId: string | null
}
export interface WorkLogRecord extends RecordBase {
  content: string
  taskId: string
}
export interface TimerRecord extends RecordBase {
  taskId: string
  startedAt: Date
  stoppedAt: Date | null
}

function translated<T extends RecordBase>(
  record: T,
  field: keyof T,
  ctx: Context,
): string | null {
  const locale = ctx.req.headers['x-locale']
  const candidate =
    locale === 'en' || locale === 'vi'
      ? record[locale]?.[String(field)]
      : undefined
  const value =
    typeof candidate === 'string' && candidate ? candidate : record[field]
  return typeof value === 'string' ? value : null
}
function windowed<T extends object>(
  query: Knex.QueryBuilder<T, T[]>,
  skip?: number | null,
  take?: number | null,
): Knex.QueryBuilder<T, T[]> {
  if ((skip ?? 0) < 0 || (take ?? 20) < 0 || (take ?? 20) > 200) {
    throw new GraphQLError('Invalid pagination', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  return query.offset(skip ?? 0).limit(take ?? 20)
}
function visibleConcepts(ctx: Context) {
  return ctx.db<ConceptRecord>('KBConcept').where('visibility', 'public')
}
const Project = builder.objectRef<ProjectRecord>('Project')
export const Task = builder.objectRef<TaskRecord>('Task')
export const WorkLog = builder.objectRef<WorkLogRecord>('TaskWorkLog')
const Concept = builder.objectRef<ConceptRecord>('KBConcept')
export const Timer = builder.objectRef<TimerRecord>('Timer')
export const Unique = builder.inputType('SiteObjectWhereUniqueInput', {
  fields: (t) => ({ id: t.string(), uri: t.string() }),
})
const TaskWhere = builder.inputType('SiteTaskWhereInput', {
  fields: (t) => ({
    status: t.string(),
    projectId: t.string(),
    incompletedOnly: t.boolean(),
  }),
})
type TaskFilter = typeof TaskWhere.$inferInput
function tasks(ctx: Context, where?: TaskFilter | null) {
  const q = ctx.db<TaskRecord>('Task')
  if (where?.projectId) {
    q.where('projectId', where.projectId)
  }
  if (where?.status) {
    const statuses: Record<string, string> = {
      NEW: 'New',
      PROGRESS: 'Progress',
      DONE: 'Done',
      REJECTED: 'Rejected',
    }
    const status = statuses[where.status]
    if (!status) {
      throw new GraphQLError('Invalid status', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }
    q.where('status', status)
  } else if (where?.incompletedOnly) {
    q.whereIn('status', ['New', 'Progress'])
  }
  return q
}
Project.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    name: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'name', c) ?? r.name,
    }),
    description: t.string({
      resolve: (r, _, c) => translated(r, 'description', c),
    }),
    intro: t.string({ resolve: (r, _, c) => translated(r, 'intro', c) }),
    content: t.string({ resolve: (r, _, c) => translated(r, 'content', c) }),
    image: t.exposeString('image'),
    commercial: t.exposeBoolean('commercial', { nullable: false }),
    status: t.exposeString('status'),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.db<UserRecord>('User').where('id', r.createdById).first(),
    }),
  }),
})
Task.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    title: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'title', c) ?? r.title,
    }),
    description: t.string({
      resolve: (r, _, c) => translated(r, 'description', c),
    }),
    content: t.string({ resolve: (r, _, c) => translated(r, 'content', c) }),
    status: t.exposeString('status', { nullable: false }),
    Project: t.field({
      type: Project,
      resolve: (r, _, c) =>
        r.projectId
          ? c.db<ProjectRecord>('Project').where('id', r.projectId).first()
          : null,
    }),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.db<UserRecord>('User').where('id', r.createdById).first(),
    }),
    Assignee: t.field({
      type: User,
      resolve: (r, _, c) =>
        r.assigneeId
          ? c.db<UserRecord>('User').where('id', r.assigneeId).first()
          : null,
    }),
    WorkLogs: t.field({
      type: [WorkLog],
      resolve: (r, _, c) =>
        c
          .db<WorkLogRecord>('TaskWorkLog')
          .where('taskId', r.id)
          .orderBy('createdAt', 'asc'),
    }),
  }),
})
WorkLog.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    content: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'content', c) ?? r.content,
    }),
    Task: t.field({
      type: Task,
      resolve: (r, _, c) =>
        c.db<TaskRecord>('Task').where('id', r.taskId).first(),
    }),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.db<UserRecord>('User').where('id', r.createdById).first(),
    }),
  }),
})
Concept.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    name: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'name', c) ?? r.name,
    }),
    description: t.string({
      resolve: (r, _, c) => translated(r, 'description', c),
    }),
    intro: t.string({ resolve: (r, _, c) => translated(r, 'intro', c) }),
    content: t.string({ resolve: (r, _, c) => translated(r, 'content', c) }),
    image: t.exposeString('image'),
    uri: t.string({
      nullable: false,
      resolve: async (r, _, c) =>
        r.uri ||
        (
          await c
            .db<{ path: string }>('SiteRoute')
            .where('kBConceptId', r.id)
            .first()
        )?.path ||
        `/concepts/${r.id}`,
    }),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.db<UserRecord>('User').where('id', r.createdById).first(),
    }),
  }),
})
Timer.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdById: t.exposeString('createdById', { nullable: false }),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: false }),
    stoppedAt: t.expose('stoppedAt', { type: 'DateTime' }),
    Task: t.field({
      type: Task,
      resolve: (r, _, c) =>
        c.db<TaskRecord>('Task').where('id', r.taskId).first(),
    }),
  }),
})
builder.queryField('projects', (t) =>
  t.field({
    type: [Project],
    args: { skip: t.arg.int(), take: t.arg.int() },
    resolve: (_, a, c) =>
      windowed(
        c.db<ProjectRecord>('Project').orderBy('updatedAt', 'desc'),
        a.skip,
        a.take ?? 100,
      ),
  }),
)
builder.queryField('project', (t) =>
  t.field({
    type: Project,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: (_, a, c) =>
      a.where.id
        ? c.db<ProjectRecord>('Project').where('id', a.where.id).first()
        : null,
  }),
)
builder.queryField('tasks', (t) =>
  t.field({
    type: [Task],
    args: {
      where: t.arg({ type: TaskWhere }),
      skip: t.arg.int(),
      take: t.arg.int(),
    },
    resolve: (_, a, c) =>
      windowed(tasks(c, a.where).orderBy('createdAt', 'desc'), a.skip, a.take),
  }),
)
builder.queryField('tasksCount', (t) =>
  t.int({
    args: { where: t.arg({ type: TaskWhere }) },
    resolve: async (_, a, c) =>
      Number(
        (await tasks(c, a.where).count<{ count: string }[]>('* as count'))[0]
          .count,
      ),
  }),
)
builder.queryField('task', (t) =>
  t.field({
    type: Task,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: (_, a, c) =>
      a.where.id
        ? c.db<TaskRecord>('Task').where('id', a.where.id).first()
        : null,
  }),
)
builder.queryField('taskWorkLogs', (t) =>
  t.field({
    type: [WorkLog],
    args: { skip: t.arg.int(), take: t.arg.int() },
    resolve: (_, a, c) =>
      windowed(
        c.db<WorkLogRecord>('TaskWorkLog').orderBy('createdAt', 'desc'),
        a.skip,
        a.take,
      ),
  }),
)
builder.queryField('taskWorkLogCount', (t) =>
  t.int({
    resolve: async (_, __, c) =>
      Number((await c.db('TaskWorkLog').count('* as count'))[0].count),
  }),
)
builder.queryField('taskWorkLog', (t) =>
  t.field({
    type: WorkLog,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: (_, a, c) =>
      a.where.id
        ? c.db<WorkLogRecord>('TaskWorkLog').where('id', a.where.id).first()
        : null,
  }),
)
builder.queryField('concepts', (t) =>
  t.field({
    type: [Concept],
    args: { skip: t.arg.int(), take: t.arg.int() },
    resolve: (_, a, c) =>
      windowed(
        visibleConcepts(c).orderBy('updatedAt', 'desc'),
        a.skip,
        a.take ?? 12,
      ),
  }),
)
builder.queryField('kBConceptsCount', (t) =>
  t.int({
    resolve: async (_, __, c) =>
      Number(
        (await visibleConcepts(c).count<{ count: string }[]>('* as count'))[0]
          .count,
      ),
  }),
)
builder.queryField('concept', (t) =>
  t.field({
    type: Concept,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: async (_, a, c) => {
      const q = visibleConcepts(c)
      if (a.where.id) {
        return q.where('id', a.where.id).first()
      }
      if (!a.where.uri) {
        return null
      }
      const route = await c
        .db<{ kBConceptId: string | null }>('SiteRoute')
        .where('path', a.where.uri)
        .first()
      return q
        .where(function () {
          this.where('uri', a.where.uri)
          if (route?.kBConceptId) {
            this.orWhere('id', route.kBConceptId)
          }
          if (a.where.uri?.startsWith('/concepts/')) {
            this.orWhere('id', a.where.uri.slice(10))
          }
        })
        .first()
    },
  }),
)
builder.queryField('timers', (t) =>
  t.field({
    type: [Timer],
    args: { skip: t.arg.int(), take: t.arg.int(), activeOnly: t.arg.boolean() },
    resolve: (_, a, c) => {
      const q = c.db<TimerRecord>('Timer').orderBy('createdAt', 'desc')
      if (a.activeOnly) {
        q.whereNull('stoppedAt')
      }
      return windowed(q, a.skip, a.take ?? 30)
    },
  }),
)

registerSiteMutations()
