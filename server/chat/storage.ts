import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Knex } from 'knex'
import { db } from '../database'

export interface TokenUsage {
  inputTokens?: number
  cachedTokens?: number
  outputTokens?: number
}

export interface Message {
  role: 'user' | 'assistant' | 'tool_call' | 'tool'
  content: string
  id?: string
  createdAt?: string
  success?: boolean
  replyToId?: string
  usage?: TokenUsage
  pageUrl?: string
}

export interface DialogueIndex {
  chatId: string
  createdAt: string
}

export interface MessageIndex {
  pageUrl?: string
  chatId: string
  usage?: TokenUsage
  id: string
  role: Message['role']
  createdAt: string
  success?: boolean
  status: 'success' | 'error' | 'unknown'
}

export type StoredMessage = Message & { id: string; createdAt: string }

interface MessageRow {
  indexed: number
  chatId: string
  payload: string
}

export class ChatStorage {
  constructor(readonly database: Knex = db) {}

  private async getSecret(): Promise<Buffer> {
    await this.database('ChatSetting')
      .insert({
        id: 'signing-key',
        value: randomBytes(32).toString('hex'),
      })
      .onConflict('id')
      .ignore()
    const row = await this.database<{ id: string; value: string }>(
      'ChatSetting',
    )
      .where({ id: 'signing-key' })
      .first()
    if (!row) {
      throw new Error('Chat signing key is missing')
    }
    return Buffer.from(row.value, 'hex')
  }

  async issue(): Promise<string> {
    const id = randomBytes(24).toString('hex')
    const signature = createHmac('sha256', await this.getSecret())
      .update(id)
      .digest('hex')
    await this.database('ChatDialogue').insert({
      chatId: id,
      createdAt: Date.now(),
    })
    return `${id}.${signature}`
  }

  async verify(authorization: string | undefined): Promise<string | null> {
    const match = /^Bearer ([a-f0-9]{48})\.([a-f0-9]{64})$/.exec(
      authorization || '',
    )
    if (!match) {
      return null
    }
    const expected = createHmac('sha256', await this.getSecret())
      .update(match[1])
      .digest()
    return timingSafeEqual(expected, Buffer.from(match[2], 'hex'))
      ? match[1]
      : null
  }

  private validateId(id: string): void {
    if (!/^[a-f0-9]{48}$/.test(id)) {
      throw new Error('Некорректный идентификатор диалога')
    }
  }

  async listDialogues(): Promise<DialogueIndex[]> {
    const rows = await this.database<{ chatId: string; createdAt: Date }>(
      'ChatDialogue',
    )
      .select('*')
      .orderBy('createdAt', 'desc')
      .orderBy('chatId', 'asc')
    return rows.map(({ chatId, createdAt }) => ({
      chatId,
      createdAt: createdAt.toISOString(),
    }))
  }

  async listMessages(): Promise<MessageIndex[]> {
    const rows = await this.database<MessageRow>('ChatMessage')
      .select('chatId', 'payload')
      .where({ indexed: 1 })
      .orderBy('sequence')
    return rows.map(({ chatId, payload }) => {
      const message = JSON.parse(payload) as StoredMessage
      return {
        chatId,
        id: message.id,
        pageUrl: message.pageUrl,
        role: message.role,
        createdAt: message.createdAt,
        usage: message.usage,
        success: message.success,
        status:
          message.success === true
            ? 'success'
            : message.success === false
              ? 'error'
              : 'unknown',
      }
    })
  }

  async append(id: string, message: StoredMessage): Promise<void> {
    this.validateId(id)
    if (
      !/^[a-zA-Z0-9_.:-]{1,256}$/.test(message.id) ||
      !/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(message.createdAt) ||
      !Number.isFinite(Date.parse(message.createdAt)) ||
      !['user', 'assistant', 'tool_call', 'tool'].includes(message.role)
    ) {
      throw new Error('Некорректные метаданные сообщения')
    }
    await this.database('ChatDialogue')
      .insert({ chatId: id, createdAt: Date.now() })
      .onConflict('chatId')
      .ignore()
    await this.database('ChatMessage').insert({
      chatId: id,
      id: message.id,
      role: message.role,
      indexed: message.role === 'user' || message.role === 'assistant' ? 1 : 0,
      payload: JSON.stringify(message),
    })
  }

  async read(id: string): Promise<Message[]> {
    this.validateId(id)
    const rows = await this.database<MessageRow>('ChatMessage')
      .select('payload')
      .where({ chatId: id })
      .orderBy('sequence')
    return rows.map(({ payload }) => JSON.parse(payload) as Message)
  }

  async save(id: string, messages: Message[]): Promise<void> {
    this.validateId(id)
    await this.database.transaction(async (trx) => {
      await trx('ChatDialogue')
        .insert({ chatId: id, createdAt: Date.now() })
        .onConflict('chatId')
        .ignore()
      await trx('ChatMessage').where({ chatId: id }).delete()
      for (const message of messages) {
        await trx('ChatMessage').insert({
          chatId: id,
          id: message.id ?? null,
          role: message.role,
          indexed:
            message.id &&
            message.createdAt &&
            (message.role === 'user' || message.role === 'assistant')
              ? 1
              : 0,
          payload: JSON.stringify(message),
        })
      }
    })
  }
}

export const contextMessages = (
  history: Message[],
  message: Message,
): Message[] => {
  history = history.filter(
    ({ role }) => role === 'user' || role === 'assistant',
  )
  const context: Message[] = [message]
  let length = message.content.length
  for (
    let index = history.length - 1;
    index > 0 && context.length < 39;
    index -= 1
  ) {
    const answer = history[index]
    if (answer.role !== 'assistant' || answer.success === false) {
      continue
    }
    const question = answer.replyToId
      ? history
          .slice(0, index)
          .find(
            (entry) => entry.id === answer.replyToId && entry.role === 'user',
          )
      : history[index - 1]
    if (!question || question.role !== 'user') {
      continue
    }
    const pair = [question, answer]
    const size = pair.reduce((sum, item) => sum + item.content.length, 0)
    if (length + size > 64000) {
      break
    }
    context.unshift(...pair)
    length += size
  }
  return context
}

export const chatStorage: ChatStorage = new ChatStorage()
