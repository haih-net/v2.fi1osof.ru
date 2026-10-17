import { GraphQLError } from 'graphql'
import type { Request } from 'express'
import {
  isHttpStatusCode,
  pageOutcome,
} from '../app/components/Statistics/status'
import {
  decodeStatisticsDomain,
  decodeStatisticsUrl,
} from '../app/components/Statistics/domains'
import type {
  StatisticsPacket,
  PageViewEvent,
  ChatStatisticsEvent,
} from '../app/components/Statistics/transport'

interface SavedStatistic {
  id: string
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{24}$/.test(value)
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max
const httpUrl = (value: unknown): value is string => {
  if (!text(value, 4096)) {
    return false
  }
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
const dimension = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 100_000

const validatePacket = (data: unknown): StatisticsPacket => {
  if (
    !isRecord(data) ||
    !validId(data.visitorId) ||
    !validId(data.tabId) ||
    !Array.isArray(data.events) ||
    data.events.length !== 1
  ) {
    throw new GraphQLError('Invalid visit statistics packet.', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  const event: unknown = data.events[0]
  if (
    isRecord(event) &&
    [
      'chat.message.sent',
      'chat.message.received',
      'chat.message.error',
    ].includes(String(event.eventId))
  ) {
    if (
      !validId(event.eventKey) ||
      !Number.isSafeInteger(event.timestamp) ||
      typeof event.timestamp !== 'number' ||
      event.timestamp < 0 ||
      event.timestamp > 8_640_000_000_000_000 ||
      !httpUrl(event.url) ||
      !text(event.messageId, 200) ||
      !text(event.message, 64000) ||
      (event.sessionId !== undefined && !text(event.sessionId, 200)) ||
      (event.response !== undefined && !text(event.response, 64000)) ||
      (event.error !== undefined &&
        (!isRecord(event.error) ||
          !text(event.error.name, 200) ||
          !text(event.error.message, 64000)))
    ) {
      throw new GraphQLError('Некорректное событие чата.', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }
    const chat: ChatStatisticsEvent = {
      eventId: event.eventId as ChatStatisticsEvent['eventId'],
      eventKey: event.eventKey,
      timestamp: event.timestamp,
      url: event.url,
      messageId: event.messageId,
      message: event.message,
      messageLength: event.message.length,
      sessionId: event.sessionId,
      status: event.eventId === 'chat.message.error' ? 'failed' : 'success',
      ...(typeof event.response === 'string'
        ? { response: event.response, responseLength: event.response.length }
        : {}),
      ...(isRecord(event.error)
        ? { error: { name: event.error.name, message: event.error.message } }
        : {}),
    }
    return { visitorId: data.visitorId, tabId: data.tabId, events: [chat] }
  }
  if (
    !isRecord(event) ||
    event.eventId !== 'page.viewed' ||
    !isHttpStatusCode(event.statusCode) ||
    event.status !== pageOutcome(event.statusCode).status ||
    !validId(event.eventKey) ||
    typeof event.timestamp !== 'number' ||
    !Number.isSafeInteger(event.timestamp) ||
    event.timestamp < 0 ||
    event.timestamp > 8_640_000_000_000_000 ||
    !httpUrl(event.url) ||
    !(event.referrer === '' || httpUrl(event.referrer)) ||
    !text(event.title, 500) ||
    !text(event.language, 100) ||
    !isRecord(event.viewport) ||
    !dimension(event.viewport.width) ||
    !dimension(event.viewport.height)
  ) {
    throw new GraphQLError('Invalid page view.', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  // Allow only visit fields; clients cannot inject identity or server metadata.
  const visit: PageViewEvent = {
    eventId: 'page.viewed',
    ...pageOutcome(event.statusCode),
    eventKey: event.eventKey,
    timestamp: event.timestamp,
    url: event.url,
    referrer: event.referrer,
    title: event.title,
    language: event.language,
    viewport: { width: event.viewport.width, height: event.viewport.height },
  }
  return { visitorId: data.visitorId, tabId: data.tabId, events: [visit] }
}

const unavailable = (): GraphQLError =>
  new GraphQLError('Statistics service unavailable.', {
    extensions: { code: 'STATISTICS_UNAVAILABLE' },
  })

export const logStatistics = async (
  data: unknown,
  req: Request,
): Promise<SavedStatistic[] | null> => {
  const endpoint: string | undefined = process.env.AGENTS_CENTER_ENDPOINT
  const token: string | undefined = process.env.AGENTS_CENTER_TOKEN
  if (!endpoint || !token) {
    return null
  }
  const packet: StatisticsPacket = validatePacket(data)
  const event = packet.events[0]
  const requestReferer: string | undefined = req.get('referer')?.slice(0, 4096)
  let response: Response
  let body: unknown
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        query: `mutation CreateActivity($input: ActivityCreateInput!) { createActivity(input: $input) { id } }`,
        variables: {
          input: {
            type: event.eventId,
            status: event.status,
            data: {
              ...event,
              url: decodeStatisticsUrl(event.url),
              referrer: decodeStatisticsUrl(
                typeof event.referrer === 'string' ? event.referrer : '',
              ),
              visitorId: packet.visitorId,
              tabId: packet.tabId,
              site: decodeStatisticsDomain(req.hostname),
              userId: null,
              authenticated: false,
              ip: req.ip ?? req.socket.remoteAddress ?? null,
              userAgent: req.get('user-agent')?.slice(0, 1000) ?? null,
              requestReferer:
                requestReferer === undefined
                  ? null
                  : decodeStatisticsUrl(requestReferer),
              receivedAt: new Date().toISOString(),
              occurredAt: new Date(event.timestamp).toISOString(),
            },
          },
        },
      }),
    })
    if (response.status === 401 || response.status === 403) {
      throw new GraphQLError('Statistics integration credentials rejected.', {
        extensions: { code: 'STATISTICS_CONFIGURATION_ERROR' },
      })
    }
    if (!response.ok) {
      throw unavailable()
    }
    body = await response.json()
  } catch (error: unknown) {
    if (error instanceof GraphQLError) {
      throw error
    }
    throw unavailable()
  }
  if (isRecord(body) && Array.isArray(body.errors) && body.errors.length) {
    const authFailed: boolean = body.errors.some(
      (error: unknown): boolean =>
        isRecord(error) &&
        (error.message === 'Valid MessageRecipient token required' ||
          (isRecord(error.extensions) &&
            error.extensions.code === 'UNAUTHENTICATED')),
    )
    throw new GraphQLError(
      authFailed
        ? 'Statistics integration credentials rejected.'
        : 'Statistics event rejected.',
      {
        extensions: {
          code: authFailed
            ? 'STATISTICS_CONFIGURATION_ERROR'
            : 'STATISTICS_REJECTED',
        },
      },
    )
  }
  if (
    !isRecord(body) ||
    !isRecord(body.data) ||
    !isRecord(body.data.createActivity) ||
    typeof body.data.createActivity.id !== 'string' ||
    !body.data.createActivity.id
  ) {
    throw unavailable()
  }
  return [{ id: body.data.createActivity.id }]
}
