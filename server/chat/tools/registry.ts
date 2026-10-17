import { graphqlRequestTool } from './graphqlRequest'
import { webSearchTool } from './webSearch'
import { getSystemInfoTool } from './getSystemInfo'
import { readSkillTool } from './readSkill'
import type { ChatTool, PreparedTool, ToolCall, ToolDefinition } from '../types'

const tools: readonly ChatTool[] = [
  graphqlRequestTool,
  readSkillTool,
  webSearchTool,
  getSystemInfoTool,
]
export const toolDefinitions: ToolDefinition[] = tools.map(
  ({ definition }) => definition,
)

export function prepareTool(call: ToolCall): PreparedTool {
  const tool = tools.find(
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
    throw new Error(`A non-empty reasoning is required before every tool call`)
  }
  return tool.prepare({ ...args, reasoning: args.reasoning })
}
