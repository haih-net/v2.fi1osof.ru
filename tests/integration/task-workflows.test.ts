import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeEach, expect, test } from 'vitest'
import graphqlModule from 'graphql/index.js'
import type { Knex } from 'knex'
import { schema } from '../../server/schema'
import { db } from '../../server/database'
import type { UserRecord } from '../../server/schema/types/User/interfaces'

let trx: Knex.Transaction
let owner: UserRecord
let other: UserRecord
let admin: UserRecord
let taskId: string
let secondTaskId: string
const createTask =
  'mutation($data:TaskCreateInput!){response:createTask(data:$data){id title status CreatedBy{id} Assignee{id} Project{id}}}'
const updateTask =
  'mutation($id:String!,$data:TaskUpdateInput!){response:updateTask(where:{id:$id},data:$data){id title status Project{id}}}'
const createLog =
  'mutation($data:TaskWorkLogCreateInput!){response:createTaskWorkLog(data:$data){id content CreatedBy{id}}}'
const updateLog =
  'mutation($id:String!,$data:TaskWorkLogUpdateInput!){response:updateTaskWorkLog(where:{id:$id},data:$data){id content}}'
const startTimer =
  'mutation($id:String!){response:createTimer(data:{taskId:$id}){id startedAt stoppedAt createdById}}'
const stopTimer =
  'mutation($id:String!,$stop:DateTime!){response:updateTimer(where:{id:$id},data:{stoppedAt:$stop}){id stoppedAt}}'
async function run(
  source: string,
  variables: Record<string, unknown>,
  user: UserRecord | null = owner,
) {
  return graphqlModule.graphql({
    schema,
    source,
    variableValues: variables,
    contextValue: { db: trx, currentUser: user, req: { headers: {} } },
  })
}
beforeEach(async () => {
  trx = await db.transaction()
  ;[owner, other, admin] = await trx<UserRecord>('User')
    .insert(
      [false, false, true].map((sudo) => ({
        id: randomUUID(),
        status: 'active' as const,
        sudo,
      })),
    )
    .returning('*')
  taskId = randomUUID()
  secondTaskId = randomUUID()
  await trx('Task').insert(
    [taskId, secondTaskId].map((id) => ({
      id,
      title: 'Задача',
      createdById: owner.id,
    })),
  )
})
afterEach(async () => {
  await trx?.rollback()
})
afterAll(async () => {
  await db.destroy()
})

test('создаёт задачу с автором и исполнителем, редактирует поля и очищает проект', async () => {
  const projectId = randomUUID()
  await trx('Project').insert({
    id: projectId,
    name: 'Проект',
    createdById: owner.id,
    commercial: false,
  })
  const created = await run(createTask, {
    data: {
      title: 'Новая задача',
      projectId,
      description: 'Описание',
      content: 'Контент',
      parentId: taskId,
    },
  })
  expect(created.errors).toBeUndefined()
  const task = created.data?.response as { id: string }
  expect(task).toMatchObject({
    title: 'Новая задача',
    status: 'New',
    CreatedBy: { id: owner.id },
    Assignee: { id: owner.id },
    Project: { id: projectId },
  })
  const updated = await run(updateTask, {
    id: task.id,
    data: {
      title: 'Обновлено',
      status: 'DONE',
      projectId: '',
      content: 'Новый контент',
    },
  })
  expect(updated.errors).toBeUndefined()
  expect(updated.data?.response).toMatchObject({
    title: 'Обновлено',
    status: 'Done',
    Project: null,
  })
  expect(await trx('Task').where({ id: task.id }).first()).toMatchObject({
    parentId: taskId,
    content: 'Новый контент',
  })
})
test('редактирование задачи разрешено автору и администратору', async () => {
  expect(
    (await run(updateTask, { id: taskId, data: { title: 'Чужое' } }, other))
      .errors,
  ).toBeDefined()
  expect((await trx('Task').where({ id: taskId }).first()).title).toBe('Задача')
  expect(
    (
      await run(
        updateTask,
        { id: taskId, data: { title: 'Администратор' } },
        admin,
      )
    ).errors,
  ).toBeUndefined()
})
test('гость не может создавать и редактировать задачи, ворклоги и таймеры', async () => {
  for (const [source, variables] of [
    [createTask, { data: { title: 'Задача' } }],
    [updateTask, { id: taskId, data: { title: 'Изменение' } }],
    [createLog, { data: { taskId, content: 'Ворклог' } }],
    [updateLog, { id: randomUUID(), data: { content: 'Изменение' } }],
    [startTimer, { id: taskId }],
    [stopTimer, { id: randomUUID(), stop: new Date().toISOString() }],
  ] as [string, Record<string, unknown>][]) {
    expect((await run(source, variables, null)).errors).toBeDefined()
  }
})
test('ворклог можно добавить к чужой задаче, редактировать может только автор', async () => {
  const created = await run(
    createLog,
    { data: { taskId, content: 'Работа выполнена' } },
    other,
  )
  expect(created.errors).toBeUndefined()
  const log = created.data?.response as { id: string }
  expect(log).toMatchObject({ CreatedBy: { id: other.id } })
  for (const user of [owner, admin]) {
    expect(
      (await run(updateLog, { id: log.id, data: { content: 'Чужое' } }, user))
        .errors,
    ).toBeDefined()
  }
  const updated = await run(
    updateLog,
    { id: log.id, data: { content: 'Уточнение' } },
    other,
  )
  expect(updated.errors).toBeUndefined()
  expect(updated.data?.response).toMatchObject({ content: 'Уточнение' })
})
test('обязательные поля и отсутствующие записи отклоняются', async () => {
  expect(
    (await run(createTask, { data: { title: '  ' } })).errors,
  ).toBeDefined()
  expect(
    (await run(createLog, { data: { taskId, content: ' ' } })).errors,
  ).toBeDefined()
  expect(
    (await run(createLog, { data: { taskId: randomUUID(), content: 'Текст' } }))
      .errors,
  ).toBeDefined()
  expect(
    (await run(updateTask, { id: randomUUID(), data: { title: 'Текст' } }))
      .errors,
  ).toBeDefined()
})
test('повторный запуск отклоняется, переход к другой задаче останавливает только свои таймеры', async () => {
  const first = await run(startTimer, { id: taskId })
  expect(first.errors).toBeUndefined()
  const firstId = (first.data?.response as { id: string }).id
  expect((await run(startTimer, { id: taskId })).errors).toBeDefined()
  const another = await run(startTimer, { id: taskId }, other)
  expect(another.errors).toBeUndefined()
  const second = await run(startTimer, { id: secondTaskId })
  expect(second.errors).toBeUndefined()
  expect(
    (await trx('Timer').where({ id: firstId }).first()).stoppedAt,
  ).not.toBeNull()
  const running = await trx('Timer')
    .whereIn('createdById', [owner.id, other.id])
    .whereNull('stoppedAt')
  expect(running).toHaveLength(2)
  expect(running).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ createdById: owner.id, taskId: secondTaskId }),
      expect.objectContaining({ createdById: other.id, taskId }),
    ]),
  )
})
test('ошибочный запуск не останавливает действующий таймер; остановка проверяет владельца', async () => {
  const started = await run(startTimer, { id: taskId })
  const id = (started.data?.response as { id: string }).id
  expect((await run(startTimer, { id: randomUUID() })).errors).toBeDefined()
  expect((await trx('Timer').where({ id }).first()).stoppedAt).toBeNull()
  const variables = { id, stop: new Date().toISOString() }
  expect((await run(stopTimer, variables, other)).errors).toBeDefined()
  expect((await trx('Timer').where({ id }).first()).stoppedAt).toBeNull()
  expect((await run(stopTimer, variables)).errors).toBeUndefined()
  expect((await trx('Timer').where({ id }).first()).stoppedAt).not.toBeNull()
})
test('администратор может остановить чужой таймер', async () => {
  const started = await run(startTimer, { id: taskId })
  const id = (started.data?.response as { id: string }).id
  expect(
    (await run(stopTimer, { id, stop: new Date().toISOString() }, admin))
      .errors,
  ).toBeUndefined()
})
