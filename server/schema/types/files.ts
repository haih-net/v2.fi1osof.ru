import { randomUUID, createHash } from 'node:crypto'
import { mkdir, rm, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { basename, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Transform, type Readable } from 'node:stream'
import { GraphQLError } from 'graphql'
import { builder, type Context } from 'server/schema/builder'
import { User } from './User/types'
import type { UserRecord } from './User/interfaces'

export interface FileRecord {
  id: string
  createdAt: Date
  updatedAt: Date
  path: string
  filename: string | null
  name: string | null
  description: string | null
  content: string | null
  mimetype: string
  encoding: string
  hash: string | null
  size: number | null
  createdById: string | null
}
interface UploadValue {
  filename: string
  mimetype: string
  encoding: string
  createReadStream: () => Readable
}
export function uploadRoot(): string {
  return resolve(process.env.UPLOADS_DIR || 'uploads')
}
export function resolveUploadPath(path: string): string {
  const root = uploadRoot()
  const result = resolve(root, path)
  if (!result.startsWith(root + sep)) {
    throw new Error('Invalid upload path')
  }
  return result
}
export function requireUser(ctx: Context): UserRecord {
  if (!ctx.currentUser || ctx.currentUser.status === 'blocked') {
    throw new GraphQLError('Unauthorized', {
      extensions: { code: 'UNAUTHENTICATED' },
    })
  }
  return ctx.currentUser
}
const FileType = builder.objectRef<FileRecord>('File').implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    path: t.string({
      nullable: false,
      resolve: (file) => file.path.replace(/^uploads\//, ''),
    }),
    filename: t.exposeString('filename', { nullable: true }),
    name: t.exposeString('name', { nullable: true }),
    description: t.exposeString('description', { nullable: true }),
    content: t.exposeString('content', { nullable: true }),
    mimetype: t.exposeString('mimetype', { nullable: false }),
    createdById: t.exposeString('createdById', { nullable: true }),
    hash: t.exposeString('hash', { nullable: true }),
    CreatedBy: t.field({
      type: User,
      nullable: true,
      resolve: async (file, _, ctx) =>
        file.createdById
          ? ((await ctx
              .db<UserRecord>('User')
              .where('id', file.createdById)
              .first()) ?? null)
          : null,
    }),
  }),
})
const FileWhere = builder.inputType('FileWhereUniqueInput', {
  fields: (t) => ({ id: t.id(), path: t.string(), hash: t.string() }),
})
const FileUpdate = builder.inputType('FileUpdateInput', {
  fields: (t) => ({
    name: t.string(),
    description: t.string(),
    content: t.string(),
  }),
})
const SingleUpload = builder.inputType('SingleUploadInput', {
  fields: (t) => ({
    file: t.field({ type: 'Upload', required: true }),
    name: t.string(),
    directory: t.string(),
  }),
})
export async function findFile(
  ctx: Context,
  where: { id?: string | null; path?: string | null; hash?: string | null },
): Promise<FileRecord | null> {
  const conditions = Object.entries(where).filter(
    ([, value]) => value !== null && value !== undefined,
  )
  if (conditions.length !== 1 || !conditions[0][1]) {
    throw new GraphQLError('Provide exactly one file identifier')
  }
  return (
    (await ctx
      .db<FileRecord>('File')
      .where(Object.fromEntries(conditions))
      .first()) ?? null
  )
}
builder.queryField('file', (t) =>
  t.field({
    type: FileType,
    nullable: true,
    args: { where: t.arg({ type: FileWhere, required: true }) },
    resolve: (_, args, ctx) => findFile(ctx, args.where),
  }),
)
builder.mutationField('updateFile', (t) =>
  t.field({
    type: FileType,
    nullable: false,
    args: {
      where: t.arg({ type: FileWhere, required: true }),
      data: t.arg({ type: FileUpdate, required: true }),
    },
    resolve: async (_, args, ctx) => {
      const user = requireUser(ctx)
      const file = await findFile(ctx, args.where)
      if (!file) {
        throw new GraphQLError('File not found')
      }
      if (file.createdById !== user.id && !user.sudo) {
        throw new GraphQLError('Can not edit alien file')
      }
      const [updated] = await ctx
        .db<FileRecord>('File')
        .where('id', file.id)
        .update({ ...args.data, updatedAt: new Date() })
        .returning('*')
      return updated
    },
  }),
)
builder.mutationField('singleUpload', (t) =>
  t.field({
    type: FileType,
    nullable: false,
    args: { data: t.arg({ type: SingleUpload, required: true }) },
    resolve: async (_, args, ctx) => {
      const user = requireUser(ctx)
      if (user.status !== 'active') {
        throw new GraphQLError('Active account required')
      }
      const upload = await (args.data.file as Promise<UploadValue>)
      const directory = args.data.directory || ''
      if (
        directory.split(/[\\/]/).some((segment) => segment === '..') ||
        directory.startsWith('/') ||
        directory.includes('\\')
      ) {
        throw new GraphQLError('Wrong directory')
      }
      const relative = `${user.id}/${directory ? directory + '/' : ''}${randomUUID()}-${basename(upload.filename)}`
      const target = resolveUploadPath(relative)
      await mkdir(resolve(target, '..'), { recursive: true })
      const hash = createHash('sha256')
      try {
        await pipeline(
          upload.createReadStream(),
          new Transform({
            transform(chunk: Buffer, _, callback) {
              hash.update(chunk)
              callback(null, chunk)
            },
          }),
          createWriteStream(target, { flags: 'wx' }),
        )
        const digest = hash.digest('hex')
        const existing = await ctx
          .db<FileRecord>('File')
          .where('hash', digest)
          .first()
        if (existing) {
          await rm(target)
          return existing
        }
        const [file] = await ctx
          .db<FileRecord>('File')
          .insert({
            id: randomUUID(),
            path: `uploads/${relative}`,
            filename: upload.filename,
            name: args.data.name ?? null,
            mimetype: upload.mimetype,
            encoding: upload.encoding,
            hash: digest,
            size: (await stat(target)).size,
            createdById: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflict('hash')
          .ignore()
          .returning('*')
        if (file) {
          return file
        }
        const duplicate = await ctx
          .db<FileRecord>('File')
          .where('hash', digest)
          .first()
        if (!duplicate) {
          throw new Error('Upload could not be saved')
        }
        await rm(target)
        return duplicate
      } catch (error) {
        // Drain request body to allow response to be sent
        ctx.req.socket?.resume()
        await rm(target, { force: true })
        throw error
      }
    },
  }),
)
