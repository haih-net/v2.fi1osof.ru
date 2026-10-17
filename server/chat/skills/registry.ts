import type { ChatSkill } from './types'

const skills: readonly ChatSkill[] = []

export const skillSummaries: string = skills
  .map(({ id, description }) => `- ${id}: ${description}`)
  .join(`\n`)

export function readSkill(id: string): ChatSkill {
  const skill = skills.find((item) => item.id === id)
  if (!skill) {
    throw new Error(
      `Unknown skill: ${id}. Available skills: ${skills.map((item) => item.id).join(', ')}`,
    )
  }
  return skill
}
