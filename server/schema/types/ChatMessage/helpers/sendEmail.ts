import { resolveMx } from 'node:dns/promises'
import nodemailer from 'nodemailer'

export interface EmailInput {
  to?: string
  subject: string
  text: string
  id?: string
}

export async function sendEmail(input: EmailInput): Promise<void> {
  const from = process.env.MAIL_FROM?.trim()
  const to = input.to || process.env.MAIL_TO?.trim() || from
  if (!from || !to) {
    throw new Error(
      'Почтовое уведомление не отправлено: не задан MAIL_FROM. Сообщение сохранено в диалоге.',
    )
  }
  const configuredHost = process.env.SMTP_HOST
  const host =
    configuredHost ||
    (await resolveMx(to.split('@')[1])).sort(
      (a, b) => a.priority - b.priority,
    )[0]?.exchange
  if (!host) {
    throw new Error('Не найден SMTP-сервер для почтового уведомления.')
  }
  const port = Number(process.env.SMTP_PORT || (configuredHost ? 587 : 25))
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false',
    name: from.split('@')[1],
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD || '',
          },
        }
      : {}),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  try {
    const result = await transport.sendMail({
      from,
      to,
      subject: input.subject,
      text: input.text,
      ...(input.id ? { messageId: `<${input.id}@${from.split('@')[1]}>` } : {}),
    })
    if (
      !result.accepted.some(
        (address) => String(address).toLowerCase() === to.toLowerCase(),
      )
    ) {
      throw new Error('SMTP-сервер не принял почтовое уведомление.')
    }
  } finally {
    transport.close()
  }
}
