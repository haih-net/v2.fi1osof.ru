export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface ToolContext {
  endpoint: string
  pageUrl?: string
  signal: AbortSignal
}

export interface PreparedTool {
  reasoning: string
  execute: (context: ToolContext) => Promise<string>
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required: string[]
      additionalProperties: false
    }
  }
}

export interface ChatTool {
  definition: ToolDefinition
  prepare: (
    args: Record<string, unknown> & { reasoning: string },
  ) => PreparedTool
}
