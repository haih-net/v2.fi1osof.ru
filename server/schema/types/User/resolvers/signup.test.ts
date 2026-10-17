import { createRequire } from 'node:module'
import { expect, it, vi } from 'vitest'
import { schema } from '../../../index'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

it('регистрация возвращает заглушку и не обращается к базе', async () => {
  const dbOld = vi.fn(() => {
    throw new Error('Обращение к базе запрещено')
  })
  const result = await graphql({
    schema,
    source:
      'mutation { signup(data: {password: "Example123"}) { success message token } }',
    contextValue: { currentUser: null, dbOld },
  })
  expect(result.errors?.map((error) => error.message)).toEqual([
    'Еще не реализовано',
  ])
  expect(result.data?.signup).toBeNull()
  expect(dbOld).not.toHaveBeenCalled()
})
