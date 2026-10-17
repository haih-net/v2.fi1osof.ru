import { builder } from '../../../builder'
import { Timer } from '../types'
import type { TimerRecord } from '../interfaces'
import { windowed } from '../../../helpers/pagination'

builder.queryField('timers', (t) =>
  t.field({
    type: [Timer],
    args: { skip: t.arg.int(), take: t.arg.int(), activeOnly: t.arg.boolean() },
    resolve: (_, a, c) => {
      const q = c.dbOld<TimerRecord>('Timer').orderBy('createdAt', 'desc')
      if (a.activeOnly) {
        q.whereNull('stoppedAt')
      }
      return windowed(q, a.skip, a.take ?? 30)
    },
  }),
)
