import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'node:module'
const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')
import type { Request } from 'express'
import type { Knex } from 'knex'
import { schema } from 'server/schema'
import type { Context } from 'server/schema/builder'
import type { UserRecord } from './User/interfaces'
import { resolveUploadPath } from './files'

const user: UserRecord = {
  id: 'owner',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'active',
  username: null,
  password: null,
  email: null,
  fullname: null,
  image: null,
  sudo: false,
  intro: null,
  content: null,
  isAiAgent: false,
}
function setup(currentUser: UserRecord | null = user) {
  const file = {
    id: 'file-1',
    path: 'uploads/owner/test.txt',
    createdById: 'owner',
    name: 'Old',
    mimetype: 'text/plain',
  }
  const query = {
    where: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(file),
    update: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ ...file, name: 'New' }]),
  }
  const db = vi.fn().mockReturnValue(query)
  const context: Context = {
    db: db as unknown as Knex,
    currentUser,
    req: {} as Request,
  }
  return { query, db, context }
}
const update =
  'mutation { updateFile(where: {id: "file-1"}, data: {name: "New"}) {id name} }'
describe('Markdown file API (mock database only)', () => {
  it('reads a file and preserves public path format', async () => {
    const { context, query } = setup()
    const result = await graphql({
      schema,
      source: '{file(where: {id: "file-1"}) {id path}}',
      contextValue: context,
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.file).toEqual({ id: 'file-1', path: 'owner/test.txt' })
    expect(query.where).toHaveBeenCalledWith({ id: 'file-1' })
  })
  it('rejects an empty identifier without reading arbitrary rows', async () => {
    const { context, db } = setup()
    const result = await graphql({
      schema,
      source: '{file(where: {}) {id}}',
      contextValue: context,
    })
    expect(result.errors?.[0].message).toContain('exactly one')
    expect(db).not.toHaveBeenCalled()
  })
  it('denies anonymous metadata edits without database access', async () => {
    const { context, db } = setup(null)
    const result = await graphql({
      schema,
      source: update,
      contextValue: context,
    })
    expect(result.errors?.[0].message).toBe('Unauthorized')
    expect(db).not.toHaveBeenCalled()
  })
  it('denies editing another user’s file', async () => {
    const { context, query } = setup({ ...user, id: 'other' })
    const result = await graphql({
      schema,
      source: update,
      contextValue: context,
    })
    expect(result.errors?.[0].message).toContain('alien file')
    expect(query.update).not.toHaveBeenCalled()
  })
  it.each([user, { ...user, id: 'admin', sudo: true }])(
    'allows the owner or administrator to edit',
    async (currentUser) => {
      const { context, query } = setup(currentUser)
      const result = await graphql({
        schema,
        source: update,
        contextValue: context,
      })
      expect(result.errors).toBeUndefined()
      expect(query.update).toHaveBeenCalledWith({
        name: 'New',
        updatedAt: expect.any(Date),
      })
      expect(query.where).toHaveBeenCalledWith('id', 'file-1')
    },
  )
  it('rejects filesystem traversal and absolute paths', () => {
    expect(() => resolveUploadPath('../uploads-other/file')).toThrow(
      'Invalid upload path',
    )
    expect(() => resolveUploadPath('/etc/passwd')).toThrow(
      'Invalid upload path',
    )
  })
  it('denies anonymous generation without calling the provider', async () => {
    const { context } = setup(null)
    const fetch = vi.spyOn(globalThis, 'fetch')
    const result = await graphql({
      schema,
      contextValue: context,
      source:
        'mutation { llmImageGeneration(input: { provider: OPENROUTER, model: GEMINI3_1_FLASH_IMAGE, prompt: "test" }) { choices { message { images {imageUrl} } } } }',
    })
    expect(result.errors?.[0].message).toBe('Unauthorized')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('upload storage with mock database', () => {
  it('writes bytes and inserts only the compatible File columns', async () => {
    const { mkdir, mkdtemp, readFile, rm } = await import('node:fs/promises')
    const { Readable } = await import('node:stream')
    const { join } = await import('node:path')
    const testRoot = join(process.cwd(), 'node_modules/.cache/markdown-tests')
    await mkdir(testRoot, { recursive: true })
    const directory = await mkdtemp(join(testRoot, 'upload-'))
    vi.stubEnv('UPLOADS_DIR', directory)
    const { context, query, db } = setup()
    const insert = vi.fn().mockReturnThis()
    const insertQuery = {
      insert,
      onConflict: vi.fn().mockReturnThis(),
      ignore: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'saved' }]),
    }
    query.first.mockResolvedValue(null)
    db.mockReturnValueOnce(query).mockReturnValueOnce(insertQuery)
    try {
      const resolver = schema.getMutationType()?.getFields()
        .singleUpload.resolve
      if (!resolver) {
        throw new Error('Upload resolver missing')
      }
      const result = await resolver(
        {},
        {
          data: {
            file: Promise.resolve({
              filename: 'sample.txt',
              mimetype: 'text/plain',
              encoding: '7bit',
              createReadStream: () => Readable.from(['test upload']),
            }),
          },
        },
        context,
        {} as import('graphql').GraphQLResolveInfo,
      )
      expect(result).toEqual({ id: 'saved' })
      const record = insert.mock.calls[0][0] as {
        path: string
        size: number
        hash: string
        createdById: string
      }
      expect(record.createdById).toBe('owner')
      expect(record.size).toBe(11)
      expect(record.hash).toHaveLength(64)
      expect(
        await readFile(
          join(directory, record.path.replace(/^uploads\//, '')),
          'utf8',
        ),
      ).toBe('test upload')
    } finally {
      vi.unstubAllEnvs()
      await rm(directory, { recursive: true, force: true })
    }
  })
  it('denies uploads for inactive accounts before filesystem or database work', async () => {
    const { context, db } = setup({ ...user, status: 'newbie' })
    const resolver = schema.getMutationType()?.getFields().singleUpload.resolve
    if (!resolver) {
      throw new Error('Upload resolver missing')
    }
    await expect(
      resolver(
        {},
        { data: { file: null } },
        context,
        {} as import('graphql').GraphQLResolveInfo,
      ),
    ).rejects.toThrow('Active account required')
    expect(db).not.toHaveBeenCalled()
  })
})
