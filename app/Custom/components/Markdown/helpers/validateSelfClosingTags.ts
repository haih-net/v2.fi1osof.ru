const VOID_ELEMENTS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]

/**
 * Validates that content does not use self-closing tags except for void elements.
 * Throws an error if invalid self-closing tags are found.
 */
export function validateSelfClosingTags(content: string): void {
  const selfClosingRegex = /<(\w[\w-]*)[^>]*\/>/g
  const matches = [...content.matchAll(selfClosingRegex)]

  const invalidTags = matches
    .map((m) => ({ tag: m[1], full: m[0] }))
    .filter(({ tag }) => !VOID_ELEMENTS.includes(tag.toLowerCase()))

  if (invalidTags.length > 0) {
    const tags = invalidTags.map((t) => t.full).join(', ')
    throw new Error(
      `Invalid self-closing tags found: ${tags}. Only void elements are allowed: ${VOID_ELEMENTS.join(', ')}`,
    )
  }
}
