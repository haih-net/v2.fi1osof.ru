import { builder } from '../../../builder'
import { Project } from '../types'
import type { ProjectRecord } from '../interfaces'
import { windowed } from '../../../helpers/pagination'
import { Unique } from '../../../inputs'

builder.queryField('projects', (t) =>
  t.field({
    type: [Project],
    args: { skip: t.arg.int(), take: t.arg.int() },
    resolve: (_, a, c) =>
      windowed(
        c.dbOld<ProjectRecord>('Project').orderBy('updatedAt', 'desc'),
        a.skip,
        a.take ?? 100,
      ),
  }),
)
builder.queryField('project', (t) =>
  t.field({
    type: Project,
    args: { where: t.arg({ type: Unique, required: true }) },
    resolve: (_, a, c) =>
      a.where.id
        ? c.dbOld<ProjectRecord>('Project').where('id', a.where.id).first()
        : null,
  }),
)
