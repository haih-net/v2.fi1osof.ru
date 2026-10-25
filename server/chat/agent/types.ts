import type { TokenUsage } from '../storage'

export type AgentEvent =
  | { type: 'authenticated'; chatId: string }
  | { type: 'ready' }
  | { type: 'content'; content: string }

export interface AgentResult {
  id: string
  success: true
  content: string
  usage: TokenUsage
}

export interface AgentRunOptions {
  stream?: boolean
  onEvent?: (event: AgentEvent, signal: AbortSignal) => void | Promise<void>
  diagnostics?: () => Record<string, unknown>
}
