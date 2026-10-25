export const apolloErrorReporter: { error: (message: string) => void } = {
  error: (message): void => console.error(message),
}
