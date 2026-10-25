import { randomUUID } from 'node:crypto'
import { logDevError } from '../../../errorLogging'
import type { AgentContext, AgentStorage } from '../context'
import type { StoredMessage } from '../../storage'
import type { ToolCall } from '../../types'

export async function executeTool<S extends AgentStorage>(
  call: ToolCall,
  message: StoredMessage,
  context: AgentContext<S>,
  onContent: (content: string) => Promise<void>,
): Promise<string> {
  const { storage, chatId } = context
  await storage.append(chatId, {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    role: 'tool_call',
    success: true,
    replyToId: message.id,
    content: JSON.stringify(
      {
        ...call,
        function: {
          ...call.function,
          arguments: (() => {
            try {
              return JSON.parse(call.function.arguments) as unknown
            } catch {
              return call.function.arguments
            }
          })(),
        },
      },
      null,
      2,
    ),
  })
  let result: string
  try {
    const tool = context.tools.prepare(call)
    if (context.config.toolExplanations) {
      const explanation = `\n\n${tool.reasoning.trim()}\n\n`
      await onContent(explanation)
    }
    result = await tool.execute(context)
  } catch (error) {
    logDevError('chat.tool', error, { chatId, toolCallId: call.id })
    result = JSON.stringify({
      error: error instanceof Error ? error.message : 'Tool failed',
    })
  }
  await storage.append(chatId, {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    role: 'tool',
    success: !JSON.parse(result).error && !JSON.parse(result).errors?.length,
    replyToId: message.id,
    content: JSON.stringify(
      { toolCallId: call.id, result: JSON.parse(result) as unknown },
      null,
      2,
    ),
  })
  if (context.signal.aborted) {
    throw new Error('Request cancelled')
  }
  return result
}
