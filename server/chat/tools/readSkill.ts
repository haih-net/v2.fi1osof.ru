import { readSkill } from '../skills/registry'
import type { ChatTool } from '../types'

export const readSkillTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'read_skill',
      description: `Прочитай полные инструкции навыка из списка в системном сообщении. Читай подходящие навыки до выполнения связанных с ними задач.`,
      parameters: {
        type: 'object',
        properties: {
          reasoning: {
            type: 'string',
            description: `Кратко объясни пользователю на его языке, зачем тебе нужен этот навык.`,
          },
          id: {
            type: 'string',
            description: `Точный ID навыка из списка доступных навыков.`,
          },
        },
        required: ['reasoning', 'id'],
        additionalProperties: false,
      },
    },
  },
  prepare(args) {
    if (typeof args.id !== 'string' || !args.id.trim()) {
      throw new Error(`A non-empty skill id is required`)
    }
    const id = args.id
    return {
      reasoning: args.reasoning,
      execute: async ({ signal }) => {
        signal.throwIfAborted()
        return JSON.stringify(readSkill(id))
      },
    }
  },
}
