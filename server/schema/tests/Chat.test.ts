import { createRequire } from 'node:module'
import { createDatabase } from '../../database'
import { expect, it, vi } from 'vitest'
import { schema } from '../index'
import { chatStorage, ChatStorage } from '../../chat/storage'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

it('выдаёт гостевой токен через GraphQL с сохранением в БД', async () => {
  const database = createDatabase()
  const storage = new ChatStorage(database)
  const issue = vi
    .spyOn(chatStorage, 'issue')
    .mockImplementation(() => storage.issue())
  const db = vi.fn(() => {
    throw new Error('Unexpected context database access')
  })
  try {
    const result = await graphql({
      schema,
      source: 'mutation CreateChatToken { createChatToken(data: {}) }',
      contextValue: { currentUser: null, db },
    })
    expect(result.errors).toBeUndefined()
    const token = result.data?.createChatToken as string
    expect(await new ChatStorage(database).verify(`Bearer ${token}`)).toBe(
      token.split('.')[0],
    )
    expect(await storage.read(token.split('.')[0])).toEqual([])
    expect(db).not.toHaveBeenCalled()
  } finally {
    issue.mockRestore()
    await database.destroy()
  }
})

it('возвращает GraphQL-ошибку без внутренних путей хранилища', async () => {
  const issue = vi
    .spyOn(chatStorage, 'issue')
    .mockRejectedValue(new Error('EACCES /private/path'))
  try {
    const result = await graphql({
      schema,
      source: 'mutation { createChatToken(data: {}) }',
    })
    expect(result.errors?.[0].message).toBe('Не удалось создать чат')
    expect(result.data).toBeNull()
  } finally {
    issue.mockRestore()
  }
})

it('закрывает индекс и отдельные сообщения для гостей и обычных пользователей', async () => {
  const dialogues = vi.spyOn(chatStorage, 'listDialogues')
  const list = vi.spyOn(chatStorage, 'listMessages')
  const read = vi.spyOn(chatStorage, 'read')
  try {
    for (const currentUser of [null, { sudo: false }]) {
      for (const source of [
        '{ chatMessageIndexes { id } }',
        '{ chatDialogues { chatId createdAt } }',
        '{ chatMessage(chatId:"test", messageId:"test") { content } }',
      ]) {
        const result = await graphql({
          schema,
          source,
          contextValue: { currentUser },
        })
        expect(result.errors?.[0].message).toBe('Доступ запрещён')
      }
    }
    expect(dialogues).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
    expect(read).not.toHaveBeenCalled()
  } finally {
    dialogues.mockRestore()
    list.mockRestore()
    read.mockRestore()
  }
})

it('выдаёт диалог только судо или владельцу проверенного токена', async () => {
  const database = createDatabase()
  const storage = new ChatStorage(database)
  const token = await storage.issue()
  const other = await storage.issue()
  const chatId = token.split('.')[0]
  const message = {
    id: 'user-test',
    createdAt: new Date().toISOString(),
    role: 'user' as const,
    content: 'Личное сообщение',
  }
  await storage.append(chatId, message)
  const read = vi
    .spyOn(chatStorage, 'read')
    .mockImplementation((id) => storage.read(id))
  const verify = vi
    .spyOn(chatStorage, 'verify')
    .mockImplementation((value) => storage.verify(value))
  const list = vi
    .spyOn(chatStorage, 'listMessages')
    .mockImplementation(() => storage.listMessages())
  const source =
    'query($chatId:String!,$token:String){chatMessages(chatId:$chatId,token:$token){id content createdAt}}'
  try {
    for (const access of [undefined, other, `${token}bad`]) {
      const result = await graphql({
        schema,
        source,
        variableValues: { chatId, token: access },
        contextValue: { currentUser: null, req: { headers: {} } },
      })
      expect(result.errors?.[0].message).toBe('Доступ запрещён')
    }
    expect(read).not.toHaveBeenCalled()
    for (const contextValue of [
      { currentUser: { sudo: true }, req: { headers: {} } },
      {
        currentUser: null,
        req: { headers: { 'dialog-token': token } },
      },
    ]) {
      const result = await graphql({
        schema,
        source,
        variableValues: { chatId },
        contextValue,
      })
      expect(result.errors).toBeUndefined()
      expect(result.data?.chatMessages).toEqual([
        {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
        },
      ])
    }
    const own = await graphql({
      schema,
      source,
      variableValues: { chatId, token },
      contextValue: { currentUser: null, req: { headers: {} } },
    })
    expect(own.errors).toBeUndefined()
    const admin = await graphql({
      schema,
      source:
        'query($chatId:String!){chatMessageIndexes{id chatId} chatMessage(chatId:$chatId,messageId:"user-test"){content}}',
      variableValues: { chatId },
      contextValue: { currentUser: { sudo: true } },
    })
    expect(admin.errors).toBeUndefined()
    expect(admin.data?.chatMessageIndexes).toEqual([
      { id: 'user-test', chatId },
    ])
    expect(admin.data?.chatMessage).toEqual({ content: message.content })
    await expect(storage.read('../private')).rejects.toThrow(
      'Некорректный идентификатор диалога',
    )
  } finally {
    read.mockRestore()
    verify.mockRestore()
    list.mockRestore()
    await database.destroy()
  }
})

it('shows tool logs only in the administrator dialogue', async () => {
  const read = vi.spyOn(chatStorage, 'read').mockResolvedValue([
    { role: 'user', content: 'Search' },
    { role: 'tool_call', content: 'Arguments and reasoning' },
    { role: 'tool', content: 'API result' },
    { role: 'assistant', content: 'Answer' },
  ])
  const verify = vi.spyOn(chatStorage, 'verify').mockResolvedValue('chat')
  try {
    for (const sudo of [true, false]) {
      const result = await graphql({
        schema,
        source: '{ chatMessages(chatId: "chat", token: "token") { role } }',
        contextValue: {
          currentUser: sudo ? { sudo } : null,
          req: { headers: {} },
        },
      })
      expect(result.errors).toBeUndefined()
      expect(result.data?.chatMessages).toEqual(
        (sudo
          ? ['user', 'tool_call', 'tool', 'assistant']
          : ['user', 'assistant']
        ).map((role) => ({ role })),
      )
    }
  } finally {
    read.mockRestore()
    verify.mockRestore()
  }
})

it('возвращает сохранённые токены из БД и сообщений, сохраняя нули и отсутствие данных', async () => {
  const usage = { inputTokens: 120, cachedTokens: 0, outputTokens: 15 }
  const database = createDatabase()
  const storage = new ChatStorage(database)
  const token = await storage.issue()
  const chatId = token.split('.')[0]
  await storage.append(chatId, {
    id: 'old',
    role: 'user',
    content: 'Вопрос',
    createdAt: new Date().toISOString(),
  })
  await storage.append(chatId, {
    id: 'answer',
    role: 'assistant',
    content: 'Ответ',
    createdAt: new Date().toISOString(),
    usage,
  })
  const read = vi
    .spyOn(chatStorage, 'read')
    .mockImplementation((id) => storage.read(id))
  const list = vi
    .spyOn(chatStorage, 'listMessages')
    .mockImplementation(() => storage.listMessages())
  try {
    const result = await graphql({
      schema,
      source: `query($chatId: String!) {
        chatMessageIndexes { usage { inputTokens cachedTokens outputTokens } }
        chatMessage(chatId: $chatId, messageId: "answer") { usage { inputTokens cachedTokens outputTokens } }
        chatMessages(chatId: $chatId) { usage { inputTokens cachedTokens outputTokens } }
      }`,
      variableValues: { chatId },
      contextValue: { currentUser: { sudo: true } },
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.chatMessageIndexes).toEqual([
      { usage: null },
      { usage },
    ])
    expect(result.data?.chatMessages).toEqual([{ usage: null }, { usage }])
    expect(result.data?.chatMessage).toEqual({ usage })
  } finally {
    read.mockRestore()
    list.mockRestore()
    await database.destroy()
  }
})

it('returns the dialogue index for administrators', async () => {
  const entries = [
    {
      chatId: 'a'.repeat(48),
      createdAt: '2026-10-17T12:00:00.000Z',
      channel: 'chat' as const,
    },
  ]
  const list = vi.spyOn(chatStorage, 'listDialogues').mockResolvedValue(entries)
  const read = vi.spyOn(chatStorage, 'read')
  try {
    const result = await graphql({
      schema,
      source: '{ chatDialogues { chatId createdAt channel } }',
      contextValue: { currentUser: { sudo: true } },
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.chatDialogues).toEqual(entries)
    expect(read).not.toHaveBeenCalled()
    expect(list).toHaveBeenCalledOnce()
  } finally {
    list.mockRestore()
    read.mockRestore()
  }
})

it('creates feedback channels and exposes them to administrators', async () => {
  const database = createDatabase()
  const storage = new ChatStorage(database)
  const issue = vi
    .spyOn(chatStorage, 'issue')
    .mockImplementation((channel) => storage.issue(channel))
  const list = vi
    .spyOn(chatStorage, 'listDialogues')
    .mockImplementation(() => storage.listDialogues())
  try {
    const created = await graphql({
      schema,
      source: 'mutation { createChatToken(data: { channel: feedback }) }',
      contextValue: { currentUser: null },
    })
    expect(created.errors).toBeUndefined()
    const token = created.data?.createChatToken as string
    expect(await storage.channel(token.split('.')[0])).toBe('feedback')
    const result = await graphql({
      schema,
      source: '{ chatDialogues { chatId channel } }',
      contextValue: { currentUser: { sudo: true } },
    })
    expect(result.errors).toBeUndefined()
    expect(result.data?.chatDialogues).toEqual([
      expect.objectContaining({ channel: 'feedback' }),
    ])
    const invalid = await graphql({
      schema,
      source: 'mutation { createChatToken(data: { channel: unknown }) }',
    })
    expect(invalid.errors).toBeDefined()
  } finally {
    issue.mockRestore()
    list.mockRestore()
    await database.destroy()
  }
})
