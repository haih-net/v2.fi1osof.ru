import { randomUUID } from 'node:crypto'
import { GraphQLError } from 'graphql'
import { builder } from '../../../builder'
import { Unique } from '../../../inputs'
import { authenticated, requiredId, nonempty } from '../../../helpers/mutations'
import { Project } from '../types'
import type { ProjectRecord } from '../interfaces'
import { ProjectCreate, ProjectUpdate } from '../inputs'

builder.mutationField('createProject', (t) =>
  t.field({
    type: Project,
    args: { data: t.arg({ type: ProjectCreate, required: true }) },
    resolve: async (_, { data }, ctx) => {
      const user = authenticated(ctx)
      return (
        await ctx
          .dbOld<ProjectRecord>('Project')
          .insert({
            ...data,
            id: randomUUID(),
            name: nonempty(data.name),
            createdById: user.id,
          })
          .returning('*')
      )[0]
    },
  }),
)
builder.mutationField('updateProject', (t) =>
  t.field({
    type: Project,
    args: {
      where: t.arg({ type: Unique, required: true }),
      data: t.arg({ type: ProjectUpdate, required: true }),
    },
    resolve: async (_, { where, data }, ctx) => {
      const user = authenticated(ctx)
      const id = requiredId(where.id)
      const project = await ctx
        .dbOld<ProjectRecord>('Project')
        .where({ id })
        .first()
      if (!project) {
        throw new GraphQLError('Project not found')
      }
      if (!user.sudo && project.createdById !== user.id) {
        throw new GraphQLError('Access denied')
      }
      return (
        await ctx
          .dbOld<ProjectRecord>('Project')
          .where({ id })
          .update({
            ...data,
            name:
              data.name === null || data.name === undefined
                ? undefined
                : nonempty(data.name),
            commercial: data.commercial ?? undefined,
            updatedAt: new Date(),
          })
          .returning('*')
      )[0]
    },
  }),
)
