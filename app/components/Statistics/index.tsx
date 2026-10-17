import { useEffect } from 'react'
import type * as React from 'react'
import { useLocation, useMatches } from 'react-router'
import { createStatisticsQueue, type StatisticsQueue } from './queue'
import { sendStatistics } from './transport'
import { decodeStatisticsUrl } from './domains'
import { matchedPageStatusCode, pageOutcome } from './status'

interface BrowserStatistics {
  visitorId: string
  tabId: string
  previousUrl: string
  currentUrl: string | null
  currentStatusCode: number | null
  queue: StatisticsQueue
}

let statistics: BrowserStatistics | undefined

const createId = (): string => {
  const bytes: Uint8Array = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (byte: number): string =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

const storedId = (
  kind: 'localStorage' | 'sessionStorage',
  key: string,
): string => {
  try {
    const storage: Storage = window[kind]
    const existing: string | null = storage.getItem(key)
    if (existing && /^[a-f0-9]{24}$/.test(existing)) {
      return existing
    }
    const id: string = createId()
    storage.setItem(key, id)
    return id
  } catch {
    return createId()
  }
}

const getStatistics = (): BrowserStatistics => {
  // One queue per document also avoids duplicate initial events in StrictMode.
  statistics ??= {
    visitorId: storedId('localStorage', 'agents-center.visitor-id'),
    tabId: storedId('sessionStorage', 'agents-center.tab-id'),
    previousUrl: decodeStatisticsUrl(document.referrer.slice(0, 4096)),
    currentUrl: null,
    currentStatusCode: null,
    queue: createStatisticsQueue(sendStatistics),
  }
  return statistics
}

interface StatisticsProps {
  statusCode?: number
}

export const Statistics: React.FC<StatisticsProps> = ({
  statusCode: errorStatusCode,
}) => {
  const { pathname, search } = useLocation()
  const matches = useMatches()
  const statusCode: number = errorStatusCode ?? matchedPageStatusCode(matches)
  useEffect(() => {
    const state: BrowserStatistics = getStatistics()
    const url: string = decodeStatisticsUrl(
      `${location.origin}${pathname}${search}`.slice(0, 4096),
    )
    if (state.currentUrl === url && state.currentStatusCode === statusCode) {
      return
    }
    state.queue.enqueue({
      visitorId: state.visitorId,
      tabId: state.tabId,
      events: [
        {
          eventId: 'page.viewed',
          ...pageOutcome(statusCode),
          eventKey: createId(),
          timestamp: Date.now(),
          url,
          referrer: state.previousUrl,
          title: document.title.slice(0, 500),
          language: navigator.language.slice(0, 100),
          viewport: { width: innerWidth, height: innerHeight },
        },
      ],
    })
    state.currentUrl = url
    state.currentStatusCode = statusCode
    state.previousUrl = url
  }, [pathname, search, statusCode])

  useEffect(() => {
    const flush = (): void => {
      getStatistics().queue.flush()
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return null
}

export const recordStatistics = (
  eventId: import('./transport').ChatStatisticsEvent['eventId'],
  data: Record<string, unknown>,
): void => {
  const state = getStatistics()
  state.queue.enqueue({
    visitorId: state.visitorId,
    tabId: state.tabId,
    events: [
      {
        ...data,
        eventId,
        eventKey: createId(),
        timestamp: Date.now(),
        url: location.href,
      },
    ],
  })
}
