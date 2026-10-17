export const site = {
  origin: 'https://fi1osof.ru',
  name: '',
  language: 'ru',
  description: '',
}

// Preserve the identity published at https://fi1osof.ru/about.
// ORCID was supplied by the author; no live profile lookup is required at build time.
export const author = {
  '@type': 'Person' as const,
  '@id': 'https://fi1osof.ru/about',
  name: 'Nikolai Lanets',
  alternateName: ['Fi1osof'],
  url: 'https://fi1osof.ru/about',
  sameAs: [
    'https://orcid.org/0009-0007-9285-0801',
    'https://github.com/fi1osof',
    'https://www.linkedin.com/in/fi1osof',
    'https://habr.com/ru/users/fi1osof/',
    'https://modx.pro/users/real-fi1osof',
    'https://npmx.dev/~fi1osof',
    'https://freecode.academy/profile/Fi1osof',
    'https://web3.bio/fi1osof.lens',
  ],
}

export function canonicalUrl(path: string): string {
  const url = new URL(path, site.origin)
  if (url.origin !== site.origin) {
    throw new Error('Canonical pages must belong to the configured site origin')
  }
  url.search = ''
  url.hash = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.href
}
