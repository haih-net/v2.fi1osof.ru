import { ChatMessageIndexesQuery } from 'app/gql/generated'

export type Entry = NonNullable<
  ChatMessageIndexesQuery['chatMessageIndexes']
>[number]
