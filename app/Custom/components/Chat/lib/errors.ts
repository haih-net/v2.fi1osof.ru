export const chatErrorMessage = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) {
    return value
  }
  if (value && typeof value === 'object') {
    if ('error' in value) {
      return chatErrorMessage(value.error, fallback)
    }
    if (
      'message' in value &&
      typeof value.message === 'string' &&
      value.message.trim()
    ) {
      return value.message
    }
  }
  return fallback
}

export const readChatError = async (response: Response): Promise<string> => {
  const fallback = `Не удалось получить ответ чата (HTTP ${response.status})`
  const text = await response.text()
  if (!text.trim()) {
    return fallback
  }
  try {
    return chatErrorMessage(JSON.parse(text) as unknown, fallback)
  } catch {
    return response.headers.get('content-type')?.includes('text/plain')
      ? text
      : fallback
  }
}
