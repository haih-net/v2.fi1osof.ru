import { afterAll, beforeAll, expect, test } from 'vitest'
import { ApolloServer } from '@apollo/server'
import { randomUUID } from 'node:crypto'
import type { Knex } from 'knex'
import type { Request } from 'express'
import type { Context } from '../../server/schema/builder'
import { schema } from '../../server/schema'
import { dbOld } from '../../server/database_old'

const api = new ApolloServer<Context>({ schema })
let trx: Knex.Transaction
let userId: string
let conceptId: string
let hiddenId: string
let projectId: string
let taskId: string
let logId: string
const request = { headers: { 'x-locale': 'ru' } } as unknown as Request
async function query(
  source: string,
  variables: Record<string, unknown> = {},
  locale = 'ru',
) {
  const result = await api.executeOperation(
    { query: source, variables },
    {
      contextValue: {
        req: Object.assign(Object.create(request) as Request, {
          headers: { 'x-locale': locale },
        }),
        dbOld: trx,
        currentUser: null,
      },
    },
  )
  if (result.body.kind !== 'single') {
    throw new Error('Expected a single response')
  }
  return result.body.singleResult
}
beforeAll(async () => {
  trx = await dbOld.transaction()
  userId = randomUUID()
  conceptId = randomUUID()
  hiddenId = randomUUID()
  projectId = randomUUID()
  taskId = randomUUID()
  logId = randomUUID()
  await trx('User').insert({ id: userId, username: 'site-test-' + userId })
  await trx('KBConcept').insert([
    {
      id: conceptId,
      name: 'Проверка',
      content: 'Полный текст',
      createdById: userId,
      visibility: 'public',
      en: { name: 'Translated title' },
      vi: { name: '' },
    },
    { id: hiddenId, name: 'Hidden', createdById: userId, visibility: 'hidden' },
  ])
  await trx('SiteRoute').insert({
    id: randomUUID(),
    path: '/test-' + conceptId,
    slug: conceptId,
    kBConceptId: conceptId,
    createdById: userId,
  })
  await trx('Project').insert({
    id: projectId,
    name: 'Test project',
    commercial: false,
    createdById: userId,
  })
  await trx('Task').insert({
    id: taskId,
    title: 'Test task',
    projectId,
    createdById: userId,
    status: 'Progress',
  })
  await trx('TaskWorkLog').insert({
    id: logId,
    content: 'Test log',
    taskId,
    createdById: userId,
  })
}, 15000)
afterAll(async () => {
  await trx?.rollback()
  await api.stop()
  await dbOld.destroy()
})

test('resolves public content by SiteRoute and falls back to source language', async () => {
  const source =
    'query($where:SiteObjectWhereUniqueInput!){concept(where:$where){id name content uri}}'
  const variables = { where: { uri: '/test-' + conceptId } }
  expect((await query(source, variables)).data?.concept).toMatchObject({
    id: conceptId,
    name: 'Проверка',
    uri: '/test-' + conceptId,
  })
  expect((await query(source, variables, 'en')).data?.concept).toMatchObject({
    name: 'Translated title',
  })
  expect((await query(source, variables, 'vi')).data?.concept).toMatchObject({
    name: 'Проверка',
  })
})
test('does not expose hidden concepts or invent missing pages', async () => {
  for (const id of [hiddenId, randomUUID()]) {
    expect(
      (await query('query($id:String!){concept(where:{id:$id}){id}}', { id }))
        .data?.concept,
    ).toBeNull()
  }
})
test('project task filters and counts use the same data', async () => {
  const response = await query(
    'query($id:String!){tasks(where:{projectId:$id,incompletedOnly:true}){id title Project{id}} tasksCount(where:{projectId:$id,incompletedOnly:true})}',
    { id: projectId },
  )
  expect(response.errors).toBeUndefined()
  expect(response.data).toMatchObject({
    tasksCount: 1,
    tasks: [{ id: taskId, Project: { id: projectId } }],
  })
  const done = await query(
    'query($id:String!){tasks(where:{projectId:$id,status:"DONE"}){id} tasksCount(where:{projectId:$id,status:"DONE"})}',
    { id: projectId },
  )
  expect(done.data).toMatchObject({ tasks: [], tasksCount: 0 })
})
test('task and worklog detail expose their related records', async () => {
  const r = await query(
    'query($id:String!){task(where:{id:$id}){id WorkLogs{id content Task{id} CreatedBy{id}}}}',
    { id: taskId },
  )
  expect(r.errors).toBeUndefined()
  expect(r.data?.task).toMatchObject({
    WorkLogs: [
      {
        id: logId,
        content: 'Test log',
        Task: { id: taskId },
        CreatedBy: { id: userId },
      },
    ],
  })
})
test('rejects invalid filters and pagination without interpolating user input', async () => {
  expect(
    (await query('{tasks(where:{status:"INVALID"}){id}}')).errors,
  ).toBeDefined()
  expect((await query('{concepts(skip:-1){id}}')).errors).toBeDefined()
  expect((await query('{projects(take:100000){id}}')).errors).toBeDefined()
  const r = await query('query($id:String!){project(where:{id:$id}){id}}', {
    id: "' OR 1=1 --",
  })
  expect(r.errors).toBeUndefined()
  expect(r.data?.project).toBeNull()
})
