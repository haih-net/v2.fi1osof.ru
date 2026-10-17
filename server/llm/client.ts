import type { ProviderMessage, ToolDefinition } from '../chat/types'

export interface ServerTool {
  type: string
  parameters: Record<string, unknown>
}

export interface CompletionRequest {
  model: string
  messages: readonly ProviderMessage[]
  stream?: boolean
  stream_options?: { include_usage: boolean }
  tools?: readonly (ToolDefinition | ServerTool)[]
  tool_choice?: 'auto' | 'none'
  max_tokens?: number
  image_config?: { aspect_ratio: string; image_size: string }
}

export interface LlmConfig {
  baseUrl: string | undefined
  apiKey: string | undefined
}

export class LlmClient {
  constructor(private readonly config: () => LlmConfig) {}

  get endpoint(): string {
    const { baseUrl } = this.config()
    if (!baseUrl) {
      throw new Error('CHAT_API_BASE_URL is not configured')
    }
    const url = new URL(`${baseUrl.replace(/\/+$/, '')}/chat/completions`)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('Некорректный адрес провайдера')
    }
    return url.href
  }

  complete(
    request: CompletionRequest,
    signal?: AbortSignal,
  ): Promise<Response> {
    const { apiKey } = this.config()
    if (!apiKey) {
      throw new Error('CHAT_API_KEY is not configured')
    }
    if (!request.model.trim()) {
      throw new Error('Model is required')
    }
    return fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(request.stream ? { Accept: 'text/event-stream' } : {}),
      },
      body: JSON.stringify(request),
      signal,
      redirect: 'error',
    })
  }
}

export const llmClient: LlmClient = new LlmClient(() => ({
  baseUrl: process.env.CHAT_API_BASE_URL,
  apiKey: process.env.CHAT_API_KEY,
}))
