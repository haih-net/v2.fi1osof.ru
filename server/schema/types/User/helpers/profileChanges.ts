import { GraphQLError } from 'graphql'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import type { CurrentUserUpdateInput } from '../inputs'
import type { UserRecord } from '../interfaces'
import { hashPassword } from './auth'

export async function profileChanges(
  data: typeof CurrentUserUpdateInput.$inferInput,
): Promise<Partial<UserRecord>> {
  const { password, isAiAgent, ...profile } = data
  if (profile.content) {
    try {
      unified().use(remarkParse).use(remarkMdx).parse(profile.content)
    } catch {
      throw new GraphQLError('Invalid content', {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }
  }
  const changes: Partial<UserRecord> = { ...profile, updatedAt: new Date() }
  if (isAiAgent !== null && isAiAgent !== undefined) {
    changes.isAiAgent = isAiAgent
  }
  if (password) {
    changes.password = await hashPassword(password)
  }
  return changes
}
