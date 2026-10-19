import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors'
import { initializeApollo } from 'app/gql/apolloClient'
import { LogStatsDocument } from 'app/gql/generated'
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

export const sendStatistics: StatisticsSender = async (packet) => {
  const controller: AbortController = new AbortController()
  const timeout: ReturnType<typeof setTimeout> = setTimeout(
    () => controller.abort(),
    6500,
  )
  try {
    const result = await initializeApollo({ withWs: false }).mutate({
      mutation: LogStatsDocument,
      variables: { data: packet },
      fetchPolicy: 'no-cache',
      context: {
        fetchOptions: {
          keepalive: true,
          signal: controller.signal,
          credentials: 'same-origin',
        },
      },
    })
    if (!result.data || !('logStats' in result.data)) {
      return 'retry'
    }
    if (result.data.logStats === null) {
      return 'disabled'
    }
    const records = result.data.logStats
    return Array.isArray(records) &&
      records.length === 1 &&
      records[0] !== null &&
      records[0] !== undefined &&
      typeof records[0].id === 'string' &&
      records[0].id.length > 0
      ? 'accepted'
      : 'retry'
  } catch (error) {
    if (CombinedGraphQLErrors.is(error)) {
      return error.errors.every(
        (entry) => entry.extensions?.code === 'STATISTICS_UNAVAILABLE',
      )
        ? 'retry'
        : 'discard'
    }
    if (ServerError.is(error)) {
      return error.statusCode === 408 ||
        error.statusCode === 429 ||
        error.statusCode >= 500
        ? 'retry'
        : 'discard'
    }
    return 'retry'
  } finally {
    clearTimeout(timeout)
  }
}
