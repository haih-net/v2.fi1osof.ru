import {
  SortOrder,
  type ConceptsConnectionQueryVariables,
} from '../../../gql/generated'

export type ConceptListKind = 'concepts' | 'reviews' | 'comments'
export function getListVariables(
  kind: ConceptListKind,
  page: number,
): ConceptsConnectionQueryVariables {
  const take = kind === 'concepts' ? 12 : 10
  return {
    where: {
      ...(kind === 'concepts'
        ? {}
        : {
            type: {
              startsWith: kind === 'reviews' ? 'review:' : 'comment:default',
            },
          }),
    },
    take,
    skip: (page - 1) * take,
    ...(kind === 'concepts' ? {} : { orderBy: { name: SortOrder.ASC } }),
    detailedInfo: false,
  }
}
