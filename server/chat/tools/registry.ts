import type { AgentStorage } from '../agent/context'
import { graphqlRequestTool } from './graphqlRequest'
import { webSearchTool } from './webSearch'
import { getSystemInfoTool } from './getSystemInfo'
import { readSkillTool } from './readSkill'
import { hasSkills } from '../skills/registry'
import type { ChatTool, PreparedTool, ToolCall, ToolDefinition } from '../types'

const tools: readonly ChatTool[] = [
  graphqlRequestTool,
  ...(hasSkills ? [readSkillTool] : []),
  webSearchTool,
  getSystemInfoTool,
]
export class ToolRegistry<S extends AgentStorage = AgentStorage> {
  readonly definitions: ToolDefinition[]

  constructor(private readonly entries: readonly ChatTool<S>[] = tools) {
    this.definitions = entries.map(({ definition }) => definition)
  }

  prepare(call: ToolCall): PreparedTool<S> {
    const tool = this.entries.find(
      ({ definition }) => definition.function.name === call.function.name,
    )
    if (!tool) {
      throw new Error(`Unknown tool: ${call.function.name}`)
    }
    const args: unknown = JSON.parse(call.function.arguments)
    if (
      !args ||
      typeof args !== 'object' ||
      Array.isArray(args) ||
      !('reasoning' in args) ||
      typeof args.reasoning !== 'string' ||
      !args.reasoning.trim()
    ) {
      throw new Error(
        `A non-empty reasoning is required before every tool call`,
      )
    }
    return tool.prepare({ ...args, reasoning: args.reasoning })
  }
}

export function prepareTool(call: ToolCall): PreparedTool {
  return new ToolRegistry().prepare(call)
}
