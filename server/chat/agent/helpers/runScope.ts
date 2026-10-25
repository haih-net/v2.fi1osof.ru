export interface RunScope {
  signal: AbortSignal
  readonly reason: 'timeout' | 'disconnect' | undefined
  dispose: () => void
}

export function createRunScope(
  parent: AbortSignal,
  timeoutMs: number,
): RunScope {
  const controller = new AbortController()
  let reason: RunScope['reason']
  const abort = (): void => {
    reason ??= 'disconnect'
    controller.abort(parent.reason)
  }
  parent.addEventListener('abort', abort, { once: true })
  if (parent.aborted) {
    abort()
  }
  const timeout = setTimeout(() => {
    reason ??= 'timeout'
    controller.abort(
      new Error(`Истёк таймаут запроса к модели (${timeoutMs / 1000} секунд)`),
    )
  }, timeoutMs)
  return {
    signal: controller.signal,
    get reason() {
      return reason
    },
    dispose: () => {
      clearTimeout(timeout)
      parent.removeEventListener('abort', abort)
      controller.abort()
    },
  }
}
