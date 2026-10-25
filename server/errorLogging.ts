export interface ErrorReporter {
  error: (...details: unknown[]) => void
}

export const errorReporter: ErrorReporter = {
  error: (...details): void => console.error(...details),
}

export function logDevError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === 'development') {
    errorReporter.error(
      `[${event}]`,
      { time: new Date().toISOString(), ...context },
      error,
    )
  }
}
