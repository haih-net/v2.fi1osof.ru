import type { PageOutcome } from './status'

export interface PageViewEvent extends PageOutcome {
  eventId: 'page.viewed'
  eventKey: string
  timestamp: number
  url: string
  referrer: string
  title: string
  language: string
  viewport: { width: number; height: number }
}

export interface ChatStatisticsEvent {
  eventId: 'chat.message.sent' | 'chat.message.received' | 'chat.message.error'
  eventKey: string
  timestamp: number
  url: string
  [key: string]: unknown
}

export interface StatisticsPacket {
  visitorId: string
  tabId: string
  events: [PageViewEvent | ChatStatisticsEvent]
}

export type DeliveryResult = 'accepted' | 'retry' | 'discard' | 'disabled'
export type StatisticsSender = (
  packet: StatisticsPacket,
) => Promise<DeliveryResult>

export const statisticsQuery: string = `mutation LogStats($data: Json!) {
  logStats(data: $data) { id }
}`

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const sendStatistics: StatisticsSender = async (packet) => {
  const controller: AbortController = new AbortController()
  const timeout: ReturnType<typeof setTimeout> = setTimeout(
    () => controller.abort(),
    6500,
  )
  try {
    const response: Response = await fetch('/api/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: statisticsQuery,
        variables: { data: packet },
      }),
      keepalive: true,
      signal: controller.signal,
    })
    if (!response.ok) {
      return response.status === 408 ||
        response.status === 429 ||
        response.status >= 500
        ? 'retry'
        : 'discard'
    }
    const body: unknown = await response.json()
    if (!isRecord(body)) {
      return 'retry'
    }
    if (Array.isArray(body.errors) && body.errors.length) {
      const retryable: boolean = body.errors.every(
        (error: unknown): boolean =>
          isRecord(error) &&
          isRecord(error.extensions) &&
          error.extensions.code === 'STATISTICS_UNAVAILABLE',
      )
      return retryable ? 'retry' : 'discard'
    }
    if (!isRecord(body.data) || !('logStats' in body.data)) {
      return 'retry'
    }
    if (body.data.logStats === null) {
      return 'disabled'
    }
    const records: unknown = body.data.logStats
    return Array.isArray(records) &&
      records.length === 1 &&
      isRecord(records[0]) &&
      typeof records[0].id === 'string' &&
      records[0].id.length > 0
      ? 'accepted'
      : 'retry'
  } catch {
    return 'retry'
  } finally {
    clearTimeout(timeout)
  }
}
