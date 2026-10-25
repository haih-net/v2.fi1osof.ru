import { LlmClient } from '../../llm/client'
import type { Message, StoredMessage } from '../storage'
import { buildSystemMessage } from '../systemMessage'
import { ToolRegistry } from '../tools/registry'

export interface AgentStorage {
  verify: (authorization: string | undefined) => Promise<string | null>
  read: (chatId: string) => Promise<Message[]>
  append: (chatId: string, message: StoredMessage) => Promise<void>
}

export interface AgentConfig {
  apiKey?: string
  model?: string
  systemMessage: string
  timeoutMs: number
  toolExplanations: boolean
  searchModel?: string
  searchTool: string
}

export interface AgentContext<S extends AgentStorage = AgentStorage> {
  storage: S
  chatId: string
  authorization?: string
  endpoint?: string
  pageUrl?: string
  signal: AbortSignal
  client: Pick<LlmClient, 'endpoint' | 'complete'>
  config: AgentConfig
  tools: ToolRegistry<S>
  receive?(message: StoredMessage, context: AgentContext<S>): Promise<void>
}

export type AgentRunContext<S extends AgentStorage = AgentStorage> = Omit<
  AgentContext<S>,
  'chatId'
>

export type AgentContextInput<S extends AgentStorage = AgentStorage> = Pick<
  AgentContext<S>,
  'storage' | 'endpoint'
> &
  Partial<
    Omit<AgentContext<S>, 'storage' | 'chatId' | 'endpoint' | 'config'>
  > & {
    config?: Partial<AgentConfig>
  }

export function createAgentContext<S extends AgentStorage>(
  input: AgentContextInput<S>,
): AgentRunContext<S> {
  const config: AgentConfig = {
    apiKey: process.env.CHAT_API_KEY,
    model: process.env.CHAT_MODEL,
    systemMessage: buildSystemMessage(),
    timeoutMs: 120000,
    toolExplanations:
      process.env.CHAT_TOOL_EXPLANATIONS_ENABLED?.trim().toLowerCase() !==
      'false',
    searchModel: process.env.CHAT_WEB_SEARCH_MODEL,
    searchTool: process.env.CHAT_WEB_SEARCH_TOOL || 'openrouter:web_search',
    ...input.config,
  }
  const baseUrl = process.env.CHAT_API_BASE_URL
  return {
    ...input,
    config,
    signal: input.signal ?? new AbortController().signal,
    client:
      input.client ?? new LlmClient(() => ({ baseUrl, apiKey: config.apiKey })),
    tools: input.tools ?? new ToolRegistry<S>(),
  }
}
