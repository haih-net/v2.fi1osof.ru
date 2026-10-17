export function logDevError(
  event: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === 'development') {
    console.error(
      `[${event}]`,
      { time: new Date().toISOString(), ...context },
      error,
    )
  }
}
