import type { ToolCall } from './types'

export function collectToolCalls(calls: ToolCall[], delta: unknown): void {
  if (!Array.isArray(delta)) {
    return
  }
  for (const item of delta) {
    if (
      !item ||
      !Number.isInteger(item.index) ||
      item.index < 0 ||
      item.index >= 8
    ) {
      throw new Error('Invalid tool call index')
    }
    const call = (calls[item.index] ??= {
      id: '',
      type: 'function',
      function: { name: '', arguments: '' },
    })
    if (typeof item.id === 'string') {
      call.id += item.id
    }
    if (typeof item.function?.name === 'string') {
      call.function.name += item.function.name
    }
    if (typeof item.function?.arguments === 'string') {
      call.function.arguments += item.function.arguments
    }
    if (
      call.function.arguments.length > 64000 ||
      call.id.length > 256 ||
      call.function.name.length > 128
    ) {
      throw new Error('Tool call is too large')
    }
  }
}
