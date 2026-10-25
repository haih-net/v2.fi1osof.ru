export class AgentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly answerId?: string,
    options?: ErrorOptions,
    readonly code?: 'INVALID_DIALOG_TOKEN',
  ) {
    super(message, options)
    this.name = 'AgentError'
  }
}
