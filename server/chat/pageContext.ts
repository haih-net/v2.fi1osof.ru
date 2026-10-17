export function parsePageUrl(value: string | undefined): string | undefined {
  if (!value || value.length > 8192) {
    return undefined
  }
  try {
    const url = new URL(value)
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return undefined
    }
    return url.href
  } catch {
    return undefined
  }
}
