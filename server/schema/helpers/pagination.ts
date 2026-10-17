import type { Knex } from 'knex'
import { GraphQLError } from 'graphql'

export function windowed<T extends object>(
  query: Knex.QueryBuilder<T, T[]>,
  skip?: number | null,
  take?: number | null,
): Knex.QueryBuilder<T, T[]> {
  if ((skip ?? 0) < 0 || (take ?? 20) < 0 || (take ?? 20) > 200) {
    throw new GraphQLError('Invalid pagination', {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }
  return query.offset(skip ?? 0).limit(take ?? 20)
}
