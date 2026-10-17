import { GraphQLError } from 'graphql'
import { builder, type Context } from '../../builder'
import { User } from '../User/types'
import type { UserRecord } from '../User/interfaces'
import type { FileRecord } from '../files'
import '../files'

interface ConceptRecord {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string
  type: string | null
  uri: string | null
  description: string | null
  intro: string | null
  content: string | null
  image: string | null
  createdById: string
  code: string | null
  parentId: string | null
  rootId: string | null
  path: string | null
  quality: number
  visibility: 'public' | 'hidden' | 'unpublished'
  data: unknown
  lat: number | null
  lng: number | null
}
interface ConceptFileRecord {
  id: string
  fileId: string
  kBConceptId: string
}

const Visibility = builder.enumType('KBConceptVisibility', {
  values: ['public', 'hidden', 'unpublished'] as const,
})
const StringFilter = builder.inputType('KBConceptStringFilter', {
  fields: (t) => ({
    equals: t.string(),
    startsWith: t.string(),
    contains: t.string(),
    in: t.stringList(),
  }),
})
const Coordinates = builder.inputType('CoordsInput', {
  fields: (t) => ({
    lat: t.float({ required: true }),
    lng: t.float({ required: true }),
  }),
})
const Where = builder.inputType('KBConceptWhereInput', {
  fields: (t) => ({
    id: t.field({ type: StringFilter }),
    type: t.field({ type: StringFilter }),
    name: t.field({ type: StringFilter }),
    description: t.field({ type: StringFilter }),
    content: t.field({ type: StringFilter }),
    code: t.field({ type: StringFilter }),
    createdById: t.field({ type: StringFilter }),
    parentId: t.field({ type: StringFilter }),
    rootId: t.field({ type: StringFilter }),
    coords: t.field({ type: Coordinates }),
    visibility: t.field({ type: Visibility }),
  }),
})
const SortOrder = builder.enumType('SortOrder', {
  values: ['asc', 'desc'] as const,
})
const OrderBy = builder.inputType('KBConceptOrderByInput', {
  fields: (t) => ({
    name: t.field({ type: SortOrder }),
    updatedAt: t.field({ type: SortOrder }),
    createdAt: t.field({ type: SortOrder }),
    type: t.field({ type: SortOrder }),
  }),
})

const FileType = builder.configStore.getOutputTypeRef('File') as ReturnType<
  typeof builder.objectRef<FileRecord>
>
const ConceptFile = builder
  .objectRef<ConceptFileRecord>('KBConceptFile')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id', { nullable: false }),
      File: t.field({
        type: FileType,
        nullable: true,
        resolve: async (relation, _args, ctx) =>
          (await ctx
            .dbOld<FileRecord>('File')
            .where('id', relation.fileId)
            .first()) ?? null,
      }),
    }),
  })
const Concept = builder.objectRef<ConceptRecord>('KBConcept').implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    name: t.exposeString('name', { nullable: false }),
    type: t.exposeString('type', { nullable: true }),
    uri: t.string({
      nullable: false,
      resolve: async (concept, _args, ctx) => {
        if (concept.uri) {
          return concept.uri
        }
        const route = await ctx
          .dbOld<{ path: string }>('SiteRoute')
          .select('path')
          .where('kBConceptId', concept.id)
          .first()
        return route?.path || `/concepts/${concept.id}`
      },
    }),
    description: t.exposeString('description', { nullable: true }),
    intro: t.exposeString('intro', { nullable: true }),
    content: t.exposeString('content', { nullable: true }),
    image: t.exposeString('image', { nullable: true }),
    createdById: t.exposeID('createdById', { nullable: false }),
    code: t.exposeString('code', { nullable: true }),
    parentId: t.exposeID('parentId', { nullable: true }),
    rootId: t.exposeID('rootId', { nullable: true }),
    path: t.exposeString('path', { nullable: true }),
    quality: t.exposeFloat('quality'),
    visibility: t.field({
      type: Visibility,
      resolve: (concept) => concept.visibility,
    }),
    data: t.expose('data', { type: 'Json', nullable: true }),
    lat: t.exposeFloat('lat', { nullable: true }),
    lng: t.exposeFloat('lng', { nullable: true }),
    CreatedBy: t.field({
      type: User,
      nullable: true,
      resolve: async (concept, _args, ctx) =>
        (await ctx
          .dbOld<UserRecord>('User')
          .where('id', concept.createdById)
          .first()) ?? null,
    }),
    Files: t.field({
      type: [ConceptFile],
      nullable: false,
      resolve: (concept, _args, ctx) =>
        ctx
          .dbOld<ConceptFileRecord>('KBConceptFile')
          .select('id', 'fileId', 'kBConceptId')
          .where('kBConceptId', concept.id)
          .orderBy('createdAt', 'asc')
          .orderBy('id', 'asc'),
    }),
  }),
})

function conceptsQuery(
  ctx: Context,
  where: typeof Where.$inferInput | null | undefined,
) {
  const query = ctx.dbOld<ConceptRecord>('KBConcept')
  if (where?.visibility) {
    query.where('visibility', where.visibility)
  } else {
    query.whereNot('visibility', 'unpublished')
  }
  for (const field of [
    'id',
    'type',
    'name',
    'description',
    'content',
    'code',
    'createdById',
    'parentId',
    'rootId',
  ] as const) {
    const filter = where?.[field]
    if (typeof filter?.equals === 'string') {
      query.where(field, filter.equals)
    }
    if (typeof filter?.startsWith === 'string') {
      query.whereRaw('substr(??, 1, length(?)) = ?', [
        field,
        filter.startsWith,
        filter.startsWith,
      ])
    }
    if (typeof filter?.contains === 'string') {
      query.whereRaw('instr(lower(??), lower(?)) > 0', [field, filter.contains])
    }
    if (filter?.in) {
      query.whereIn(field, filter.in)
    }
  }
  if (where?.coords) {
    const { lat, lng } = where.coords
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new GraphQLError('Invalid coordinates', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }
    query
      .whereNotNull('lat')
      .whereNotNull('lng')
      .whereRaw(
        `6371 * acos(min(1.0, max(-1.0,
      cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?))
      + sin(radians(?)) * sin(radians(lat))))) < ?`,
        [lat, lng, lat, 10],
      )
  }
  return query
}

builder.queryField('concepts', (t) =>
  t.field({
    type: [Concept],
    nullable: false,
    args: {
      where: t.arg({ type: Where }),
      orderBy: t.arg({ type: OrderBy }),
      skip: t.arg.int(),
      take: t.arg.int(),
    },
    resolve: (_root, { where, orderBy, skip, take }, ctx) => {
      if ((skip ?? 0) < 0 || (take ?? 0) < 0) {
        throw new GraphQLError('Invalid pagination', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      const query = conceptsQuery(ctx, where).select('KBConcept.*')
      for (const field of ['createdAt', 'updatedAt', 'name', 'type'] as const) {
        if (orderBy?.[field]) {
          query.orderBy(field, orderBy[field])
        }
      }
      if (typeof take === 'number') {
        query.limit(take)
      }
      if (typeof skip === 'number') {
        query.offset(skip)
      }
      return query
    },
  }),
)
builder.queryField('kBConceptsCount', (t) =>
  t.int({
    nullable: false,
    args: { where: t.arg({ type: Where }) },
    resolve: async (_root, { where }, ctx) => {
      const rows = await conceptsQuery(ctx, where).count<{ count: string }[]>({
        count: '*',
      })
      return Number(rows[0]?.count ?? 0)
    },
  }),
)

const WhereUnique = builder.inputType('KBConceptWhereUniqueInput', {
  fields: (t) => ({ id: t.string(), uri: t.string() }),
})

builder.queryField('concept', (t) =>
  t.field({
    type: Concept,
    nullable: true,
    args: { where: t.arg({ type: WhereUnique, required: true }) },
    resolve: async (_root, { where: { id, uri } }, ctx) => {
      if (!id && !uri) {
        throw new GraphQLError('An id or uri is required', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }
      // Apply the same visibility rules to direct URLs and legacy aliases.
      const query = conceptsQuery(ctx, undefined)
      if (id) {
        query.where('id', id)
      }
      if (uri) {
        query.where(function () {
          this.where('uri', uri).orWhereIn(
            'id',
            ctx.dbOld('SiteRoute').select('kBConceptId').where('path', uri),
          )
          const fallback = /^\/concepts\/([^/]+)$/.exec(uri)
          if (fallback) {
            this.orWhere('id', fallback[1])
          }
        })
      }
      return (await query.first()) ?? null
    },
  }),
)
