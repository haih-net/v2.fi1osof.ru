import type { UserRecord } from '../schema/types/User/interfaces'
import {
  sendEmail,
  type EmailInput,
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
    console.error(
      'Invalid CHAT_EMAIL_NOTIFICATIONS_INTERVAL_HOURS; using 3 hours',
    )
    return 3 * 3600000
  }
  return hours * 3600000
}

export function createChatMessages(
  storage: ChatStorage = chatStorage,
  send: (input: EmailInput) => Promise<void> = sendEmail,
): ChatMessages {
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
        const admins = await storage
          .database<UserRecord>('User')
          .select('email')
          .where({ sudo: true })
          .whereNotNull('email')
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
              send({
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
              console.error(
                'Chat notification delivery failed',
                { chatId, messageId: message.id, to },
                error,
              )
            })
        }
      } catch (error) {
        console.error(
          'Chat notification recipients lookup failed',
          { chatId, messageId: message.id },
          error,
        )
      }
    },
  }
}
