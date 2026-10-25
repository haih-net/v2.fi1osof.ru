import {
  createAgentContext,
  type AgentContext,
  type AgentContextInput,
  type AgentStorage,
} from '../agent/context'

export function createToolContext<S extends AgentStorage>(
  input: AgentContextInput<S> & { chatId: string },
): AgentContext<S> {
  return { ...createAgentContext(input), chatId: input.chatId }
}
