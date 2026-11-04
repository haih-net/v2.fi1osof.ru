export interface PageErrorRecord {
  url: string
  lastOccurredAt: number
  statusCode: number | null
  count: number
  status: 'Review' | 'Resolved' | null
}
