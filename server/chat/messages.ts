import type { Knex } from 'knex'
import { errorReporter } from '../errorLogging'
import type { UserRecord } from '../schema/types/User/interfaces'
import {
  EmailInput,
  sendEmail,
} from '../schema/types/ChatMessage/helpers/sendEmail'
import { chatStorage, type ChatStorage, type StoredMessage } from './storage'

export interface ChatMessages {
  receive(chatId: string, message: StoredMessage, origin: string): Promise<void>
}

function notificationInterval(): number | null {
  if (
    process.env.CHAT_EMAIL_NOTIFICATIONS_ENABLED?.trim().toLowerCase() ===
    'false'
  ) {
    return null
  }
  const configured = process.env.CHAT_EMAIL_NOTIFICATIONS_INTERVAL_HOURS?.trim()
  const hours = configured ? Number(configured) : 3
  if (
    !Number.isFinite(hours) ||
    hours <= 0 ||
    !Number.isFinite(hours * 3600000)
  ) {
    errorReporter.error(
      'Invalid CHAT_EMAIL_NOTIFICATIONS_INTERVAL_HOURS; using 3 hours',
    )
    return 3 * 3600000
  }
  return hours * 3600000
}

type createChatMessagesProps = {
  storage: ChatStorage | undefined
  usersDatabase: Knex
  sendNotify: ((input: EmailInput) => Promise<void>) | undefined
}

export function createChatMessages({
  storage = chatStorage,
  usersDatabase,
  sendNotify = sendEmail,
}: createChatMessagesProps): ChatMessages {
  return {
    async receive(chatId, message, origin): Promise<void> {
      const { channel, previous } = await storage.appendUserMessage(
        chatId,
        message,
      )
      if (channel !== 'chat') {
        return
      }
      const interval = notificationInterval()
      if (
        interval === null ||
        (previous &&
          (!previous.createdAt ||
            !(
              Date.parse(message.createdAt) - Date.parse(previous.createdAt) >
              interval
            )))
      ) {
        return
      }
      try {
        const admins = await usersDatabase<UserRecord>('User')
          .select('email')
          .where({ sudo: true })
          .whereNotNull('email')

        if (admins.length > 0) {
          const recipients = new Set<string>()
          for (const admin of admins) {
            const email = admin.email?.trim().toLowerCase()
            if (email) {
              recipients.add(email)
            }
          }
          for (const to of recipients) {
            void Promise.resolve()
              .then(() =>
                sendNotify({
                  to,
                  subject: previous
                    ? 'Chat conversation resumed'
                    : 'New chat conversation',
                  text: [
                    `Site: ${origin}`,
                    `Dialogue: ${chatId}`,
                    `Open dialogue: ${origin.replace(/\/$/, '')}/admin-panel/chat/dialogues/${chatId}`,
                    ...(message.pageUrl ? [`Page: ${message.pageUrl}`] : []),
                    '',
                    message.content,
                  ].join('\n'),
                  id: message.id,
                }),
              )
              .catch((error: unknown) => {
                errorReporter.error(
                  'Chat notification delivery failed',
                  { chatId, messageId: message.id, to },
                  error,
                )
              })
          }
        }
      } catch (error) {
        errorReporter.error(
          'Chat notification recipients lookup failed',
          { chatId, messageId: message.id },
          error,
        )
      }
    },
  }
}
