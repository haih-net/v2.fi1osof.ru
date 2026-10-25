import type { AgentStorage } from '../agent/context'
import type { StoredMessage } from '../storage'

export class MemoryStorage implements AgentStorage {
  readonly messages = new Map<string, StoredMessage[]>()
  readonly values = new Map<string, string>()

  async verify(authorization: string | undefined): Promise<string | null> {
    return authorization === 'Bearer test-token' ? 'same-dialogue' : null
  }

  async read(chatId: string): Promise<StoredMessage[]> {
    return [...(this.messages.get(chatId) ?? [])]
  }

  async append(chatId: string, message: StoredMessage): Promise<void> {
    const messages = this.messages.get(chatId) ?? []
    messages.push(message)
    this.messages.set(chatId, messages)
  }
}
