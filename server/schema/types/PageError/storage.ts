import type { Knex } from 'knex'
import type { PageViewEvent } from '../../../../app/components/Statistics/transport'

export async function recordPageError(
  db: Knex,
  event: PageViewEvent,
): Promise<void> {
  if (event.status !== 'failed') {
    return
  }
  await db.transaction(async (trx) => {
    if (
      await trx('PageErrorEvent').where({ eventKey: event.eventKey }).first()
    ) {
      return
    }
    await trx('PageError')
      .insert({
        url: event.url,
        lastOccurredAt: event.timestamp,
        statusCode: event.statusCode,
        count: 1,
        status: null,
      })
      .onConflict('url')
      .merge({
        lastOccurredAt: trx.raw('MAX(lastOccurredAt, ?)', [event.timestamp]),
        statusCode: trx.raw(
          'CASE WHEN ? >= lastOccurredAt THEN ? ELSE statusCode END',
          [event.timestamp, event.statusCode],
        ),
        count: trx.raw('count + 1'),
        status: null,
      })
    await trx('PageErrorEvent').insert({
      eventKey: event.eventKey,
      url: event.url,
    })
  })
}
