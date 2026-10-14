import type { Knex } from 'knex'
import { GraphQLError } from 'graphql'
import type { StringFilter, UserRecord } from '../interfaces'
import type { UserWhere, UserWhereUnique } from '../inputs'

type UserQuery = Knex.QueryBuilder<UserRecord, UserRecord[]>

export function findUser(db: Knex, where: UserWhereUnique): UserQuery {
  const query = db<UserRecord>('User')
  let supplied = false
  for (const key of ['id', 'email', 'username'] as const) {
    if (where[key] !== null && where[key] !== undefined) {
      query.where(key, where[key])
      supplied = true
    }
  }
  if (!supplied) {
    throw new GraphQLError('Email, username or id required', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  return query
}

function stringFilter(
  query: UserQuery,
  column: string,
  filter: StringFilter,
  inheritedMode = false,
): void {
  const insensitive =
    filter.mode === 'insensitive' ||
    ((filter.mode === null || filter.mode === undefined) && inheritedMode)
  const field = insensitive ? 'lower(??)' : '??'
  const value = (s: string): string => (insensitive ? s.toLowerCase() : s)
  if (filter.equals === null) {
    query.whereNull(column)
  } else if (filter.equals !== undefined) {
    query.whereRaw(`${field} = ?`, [column, value(filter.equals)])
  }
  for (const key of ['in', 'notIn'] as const) {
    const items = filter[key]
    if (items) {
      if (!items.length) {
        if (key === 'in') {
          query.whereRaw('false')
        }
        continue
      }
      query.whereRaw(
        `${field} ${key === 'in' ? 'in' : 'not in'} (${items.map(() => '?').join(',')})`,
        [column, ...items.map(value)],
      )
    }
  }
  for (const [key, operator] of [
    ['lt', '<'],
    ['lte', '<='],
    ['gt', '>'],
    ['gte', '>='],
  ] as const) {
    const item = filter[key]
    if (item !== null && item !== undefined) {
      query.whereRaw(`${field} ${operator} ?`, [column, value(item)])
    }
  }
  for (const key of ['contains', 'startsWith', 'endsWith'] as const) {
    const item = filter[key]
    if (item !== null && item !== undefined) {
      query.whereRaw(`?? ${insensitive ? 'ilike' : 'like'} ?`, [
        column,
        `${key !== 'startsWith' ? '%' : ''}${item}${key !== 'endsWith' ? '%' : ''}`,
      ])
    }
  }
  const nested = filter.not
  if (nested === null) {
    query.whereNotNull(column)
  } else if (nested) {
    query.whereNot(function () {
      stringFilter(this, column, nested, insensitive)
    })
  }
}

export function usersQuery(
  db: Knex,
  where: UserWhere | null | undefined,
  currentUser: UserRecord | null,
): UserQuery {
  const query = db<UserRecord>('User')
  if (where?.status) {
    query.where('status', where.status)
  } else if (!currentUser?.sudo) {
    query.where(function () {
      this.where('status', 'active')
      if (currentUser) {
        this.orWhere('id', currentUser.id)
      }
    })
  }
  for (const key of ['id', 'email', 'isAiAgent'] as const) {
    if (where?.[key] !== undefined && where[key] !== null) {
      query.where(key, where[key])
    } else if (key === 'email' && where?.email === null) {
      query.whereNull('email')
    }
  }
  for (const key of [
    'username',
    'fullname',
    'intro',
    'content',
    'image',
  ] as const) {
    const filter = where?.[key]
    if (filter) {
      stringFilter(query, key, filter)
    }
  }
  return query
}
