import { afterEach, expect, test, vi } from 'vitest'
import { toUnicode } from 'punycode/punycode.es6.js'
import { decodeStatisticsDomain, decodeStatisticsUrl } from './domains'

vi.mock('punycode/punycode.es6.js', { spy: true })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test.each([
  ['xn--e1afmkfd.test', 'пример.test'],
  ['www.xn--e1afmkfd.xn--p1ai', 'www.пример.рф'],
  ['пример.рф', 'пример.рф'],
  ['site.test', 'site.test'],
  ['127.0.0.1', '127.0.0.1'],
  ['[::1]', '[::1]'],
  ['xn--', 'xn--'],
])('decodes statistics hostname %s', (input: string, expected: string) => {
  expect(decodeStatisticsDomain(input)).toBe(expected)
})

test.each([
  ['https://xn--e1afmkfd.test/', 'https://пример.test/'],
  [
    'http://www.xn--e1afmkfd.xn--p1ai:8080/%D0%BF/xn--p1ai?next=xn--p1ai&value=%2F#xn--p1ai',
    'http://www.пример.рф:8080/%D0%BF/xn--p1ai?next=xn--p1ai&value=%2F#xn--p1ai',
  ],
  ['https://пример.рф/page?q=1', 'https://пример.рф/page?q=1'],
  [
    'https://xn--p1ai:p%40ss@xn--e1afmkfd.xn--p1ai/page',
    'https://xn--p1ai:p%40ss@пример.рф/page',
  ],
  ['https://site.test/xn--p1ai', 'https://site.test/xn--p1ai'],
  ['http://127.0.0.1:3000/', 'http://127.0.0.1:3000/'],
  ['http://[::1]:3000/', 'http://[::1]:3000/'],
  ['', ''],
  ['not a URL', 'not a URL'],
  ['https://xn--/', 'https://xn--/'],
  ['mailto:user@xn--e1afmkfd.xn--p1ai', 'mailto:user@xn--e1afmkfd.xn--p1ai'],
])(
  'decodes only the HTTP URL hostname in %s',
  (input: string, expected: string) => {
    expect(decodeStatisticsUrl(input)).toBe(expected)
  },
)

test('keeps the original URL when parsing is unavailable', () => {
  vi.stubGlobal('URL', undefined)
  const url: string = 'http://xn--80aaafca4ocd5a.localhost:3100/'
  expect(decodeStatisticsUrl(url)).toBe(url)
})

test('keeps the original hostname and URL when the decoder throws', () => {
  vi.mocked(toUnicode).mockImplementation(() => {
    throw new RangeError('Invalid input')
  })
  expect(decodeStatisticsDomain('xn--e1afmkfd.xn--p1ai')).toBe(
    'xn--e1afmkfd.xn--p1ai',
  )
  const url: string = 'http://xn--80aaafca4ocd5a.localhost:3100/'
  expect(decodeStatisticsUrl(url)).toBe(url)
})
