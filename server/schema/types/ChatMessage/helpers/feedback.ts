import { errorReporter } from '../../../../errorLogging'
import { chatStorage, type ChatStorage } from '../../../../chat/storage'
import type { Request } from 'express'
import { GraphQLError } from 'graphql'
import { sendEmail } from './sendEmail'

export interface FeedbackInput {
  token: string
  contacts: string
  message: string
}
export type FeedbackDelivery = (text: string, id: string) => Promise<void>

export function createFeedback(
  send: FeedbackDelivery = (text, id) =>
    sendEmail({ subject: 'Сообщение с сайта', text, id }),
  now: () => number = Date.now,
  storage: ChatStorage = chatStorage,
) {
  interface State {
    address: string
    issued: number
    payload?: string
    pending?: Promise<string>
    receipt?: string
  }
  const states = new Map<string, State>()
  const attempts = new Map<string, { count: number; until: number }>()
  const fail = (message: string): never => {
    throw new GraphQLError(message)
  }
  const limit = (key: string, maximum: number): void => {
    for (const [key, value] of attempts) {
      if (value.until <= now()) {
        attempts.delete(key)
      }
    }
    const entry = attempts.get(key) || { count: 0, until: now() + 15 * 60000 }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > maximum) {
      fail('Слишком много попыток. Попробуйте через 15 минут.')
    }
  }
  return {
    async submit(input: FeedbackInput, req: Request): Promise<string> {
      const address = req.socket.remoteAddress || 'unknown'
      let chatId: string | null
      let channel: string | null
      try {
        chatId = await storage.verify(`Bearer ${input.token}`)
        channel = chatId ? await storage.channel(chatId) : null
      } catch (error) {
        errorReporter.error('Feedback dialogue verification failed', error)
        return fail(
          'Не удалось проверить диалог: хранилище сообщений недоступно. Сообщение ещё не сохранено. Попробуйте отправить позже.',
        )
      }
      if (!chatId || channel !== 'feedback') {
        return fail(
          'Не удалось подтвердить диалог: токен недействителен или относится к другому каналу. Закройте форму и откройте её снова.',
        )
      }
      for (const [key, value] of states) {
        if (now() - value.issued >= 30 * 60000 && !value.pending) {
          states.delete(key)
        }
      }
      let state = states.get(chatId)
      if (!state) {
        if (states.size >= 5000) {
          return fail(
            'Сервер обрабатывает слишком много обращений. Сообщение ещё не сохранено. Попробуйте позже.',
          )
        }
        state = { address, issued: now() }
        states.set(chatId, state)
      }
      const contacts = input.contacts.trim(),
        message = input.message.trim()
      if (
        !contacts ||
        contacts.length > 1000 ||
        !message ||
        message.length > 10000
      ) {
        fail(
          'Заполните контакты (до 1000 символов) и сообщение (до 10000 символов).',
        )
      }
      const payload = JSON.stringify({ contacts, message })
      if (state.payload && state.payload !== payload) {
        fail('Для нового сообщения откройте форму заново.')
      }
      if (state.receipt) {
        return state.receipt
      }
      if (state.pending) {
        return state.pending
      }
      limit(`send:${address}`, 5)
      state.payload = payload
      const current = state
      state.pending = (async () => {
        let created: boolean
        try {
          created = await storage.appendFeedback(
            chatId,
            `Контакты:\n${contacts}\n\nСообщение:\n${message}`,
          )
        } catch (error) {
          errorReporter.error('Feedback storage failed', error)
          return fail(
            'Не удалось сохранить сообщение в диалоге. Текст остался в форме — попробуйте отправить ещё раз.',
          )
        }
        current.receipt = 'Сообщение принято и сохранено. Спасибо за обращение!'
        if (created) {
          const origin =
            req.get('origin') ||
            `${req.protocol}://${req.get('host') || 'unknown'}`
          void Promise.resolve()
            .then(() =>
              send(
                `Сайт: ${origin}\nДиалог: ${chatId}\nКонтакты:\n${contacts}\n\nСообщение:\n${message}`,
                chatId,
              ),
            )
            .catch((error) => {
              errorReporter.error('Feedback delivery failed', error)
            })
        }
        return current.receipt
      })().finally(() => {
        current.pending = undefined
      })
      return state.pending
    },
  }
}
