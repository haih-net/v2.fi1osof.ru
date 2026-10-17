import { builder } from '../../builder'
import type { ProjectRecord } from './interfaces'
import { User } from '../User/types'
import type { UserRecord } from '../User/interfaces'
import { translated } from '../../helpers/translated'

export const Project = builder.objectRef<ProjectRecord>('Project')
Project.implement({
  fields: (t) => ({
    id: t.exposeID('id', { nullable: false }),
    createdAt: t.expose('createdAt', { type: 'DateTime', nullable: false }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime', nullable: false }),
    name: t.string({
      nullable: false,
      resolve: (r, _, c) => translated(r, 'name', c) ?? r.name,
    }),
    description: t.string({
      resolve: (r, _, c) => translated(r, 'description', c),
    }),
    intro: t.string({ resolve: (r, _, c) => translated(r, 'intro', c) }),
    content: t.string({ resolve: (r, _, c) => translated(r, 'content', c) }),
    image: t.exposeString('image'),
    commercial: t.exposeBoolean('commercial', { nullable: false }),
    status: t.exposeString('status'),
    CreatedBy: t.field({
      type: User,
      resolve: (r, _, c) =>
        c.dbOld<UserRecord>('User').where('id', r.createdById).first(),
    }),
  }),
})
