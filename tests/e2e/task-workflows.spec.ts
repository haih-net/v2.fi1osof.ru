import { test, expect } from '@playwright/test'

test('создание и редактирование задачи и ворклога, запуск и остановка таймера', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const user = {
    __typename: 'User',
    id: 'workflow-user',
    username: 'workflow',
    fullname: 'Проверка',
    sudo: false,
    status: 'active',
    createdAt: '2026-10-14T10:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
    isAiAgent: false,
    intro: null,
    content: null,
    image: null,
  }
  const task = {
    id: 'workflow-task',
    title: '',
    description: '',
    content: '',
    status: 'New',
    createdAt: '2026-10-14T10:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
    Project: null,
    CreatedBy: user,
    Assignee: user,
    WorkLogs: [] as Record<string, unknown>[],
  }
  let timer: Record<string, unknown> | null = null
  let log: Record<string, unknown> | null = null
  let failSave = true
  await page.route('**/api/', async (route) => {
    const { operationName, variables } = route.request().postDataJSON() as {
      operationName: string
      variables: { data?: Record<string, unknown> }
    }
    let data: Record<string, unknown>
    switch (operationName) {
      case 'me':
        data = { me: user }
        break
      case 'timers':
        data = { timers: timer && !timer.stoppedAt ? [timer] : [] }
        break
      case 'createTask':
        if (failSave) {
          failSave = false
          await route.fulfill({
            json: { errors: [{ message: 'Проверка ошибки сохранения' }] },
          })
          return
        }
        Object.assign(task, variables.data)
        data = { response: task }
        break
      case 'updateTask':
        Object.assign(task, variables.data)
        data = { response: task }
        break
      case 'task':
        data = { response: task }
        break
      case 'createTaskWorkLog':
        log = {
          id: 'workflow-log',
          content: variables.data?.content,
          createdAt: '2026-10-14T10:00:00Z',
          CreatedBy: user,
          Task: { ...task, WorkLogs: undefined },
        }
        task.WorkLogs = [log]
        data = { response: log }
        break
      case 'updateTaskWorkLog':
        if (!log) {
          throw new Error('Ворклог ещё не создан')
        }
        Object.assign(log, variables.data)
        data = { response: log }
        break
      case 'taskWorkLog':
        data = { response: log }
        break
      case 'createTimer':
        timer = {
          id: 'workflow-timer',
          createdById: user.id,
          startedAt: new Date().toISOString(),
          stoppedAt: null,
          Task: { ...task, WorkLogs: undefined },
        }
        data = { response: timer }
        break
      case 'updateTimer':
        if (!timer) {
          throw new Error('Таймер ещё не создан')
        }
        Object.assign(timer, variables.data)
        data = { response: timer }
        break
      default:
        await route.continue()
        return
    }
    await route.fulfill({ json: { data } })
  })
  await page.goto('/tasks/create')
  await page.getByLabel('Название', { exact: true }).fill('Проверочная задача')
  await page
    .getByRole('group', { name: 'Описание', exact: true })
    .locator('[contenteditable="true"]')
    .fill('Описание задачи')
  await page
    .getByRole('group', { name: 'Контент', exact: true })
    .locator('[contenteditable="true"]')
    .fill('Контент задачи')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Проверка ошибки сохранения',
  )
  await expect(page.getByLabel('Название', { exact: true })).toHaveValue(
    'Проверочная задача',
  )
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page).toHaveURL(/\/tasks\/workflow-task$/)
  await expect(page.locator('main')).toContainText('Контент задачи')
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
  await page.getByLabel('Название', { exact: true }).fill('Обновлённая задача')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Обновлённая задача',
  )
  await page
    .getByRole('button', { name: 'Запустить таймер', exact: true })
    .click()
  await expect(page.locator('header')).toContainText('Обновлённая задача')
  await page
    .locator('header')
    .getByRole('button', { name: 'Остановить', exact: true })
    .click()
  await expect(
    page
      .locator('header')
      .getByRole('button', { name: 'Остановить', exact: true }),
  ).toHaveCount(0)
  expect((timer as Record<string, unknown> | null)?.stoppedAt).toBeTruthy()
  await page
    .getByRole('button', { name: 'Создать ворклог', exact: true })
    .click()
  await page
    .getByRole('group', { name: 'Контент', exact: true })
    .locator('[contenteditable="true"]')
    .fill('Новый ворклог')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.locator('main')).toContainText('Новый ворклог')
  await page.locator('a[href="/worklogs/workflow-log"]').click()
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
  await page
    .getByRole('group', { name: 'Контент', exact: true })
    .locator('[contenteditable="true"]')
    .fill('Уточнённый ворклог')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.locator('main')).toContainText('Уточнённый ворклог')
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
