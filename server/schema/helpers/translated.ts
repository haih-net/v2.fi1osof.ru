import type { Context } from '../builder'
import type { RecordBase } from './records'

export function translated<T extends RecordBase>(
  record: T,
  field: keyof T,
  ctx: Context,
): string | null {
  const locale = ctx.req.headers['x-locale']
  const candidate =
    locale === 'en' || locale === 'vi'
      ? record[locale]?.[String(field)]
      : undefined
  const value =
    typeof candidate === 'string' && candidate ? candidate : record[field]
  return typeof value === 'string' ? value : null
}
