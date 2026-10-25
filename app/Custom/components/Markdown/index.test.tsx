// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'

import { validateSelfClosingTags } from './helpers/validateSelfClosingTags'

import { Markdown } from './'

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Markdown component mechanics', () => {
  describe('LaTeX rendering', () => {
    it('renders inline math with $ delimiters', () => {
      const content = 'The formula is $E = mc^2$ in physics.'

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      const katexSpan = container.querySelector('.katex')
      expect(katexSpan).toBeTruthy()
      expect(
        document.querySelector('link[rel="stylesheet"]')?.getAttribute('href'),
      ).toMatch(/katex.*\.css/)
    })

    it('renders block math with $$ delimiters', () => {
      const content = `Block formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}
$$`

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      const katexDisplay = container.querySelector('.katex-display')
      expect(katexDisplay).toBeTruthy()
    })

    it('renders multiple inline math expressions', () => {
      const content = 'First $a^2$ and second $b^2$ formulas.'

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      const katexSpans = container.querySelectorAll('.katex')
      expect(katexSpans.length).toBe(2)
    })

    it('renders mixed inline and block math', () => {
      const content = `Inline $E = mc^2$ and block:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$`

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      const inlineKatex = container.querySelectorAll(
        '.katex:not(.katex-display .katex)',
      )
      const blockKatex = container.querySelector('.katex-display')
      expect(inlineKatex.length).toBeGreaterThanOrEqual(1)
      expect(blockKatex).toBeTruthy()
    })
  })

  describe('HTML tags with attributes', () => {
    it('renders span with data attributes', () => {
      const content = '<span data-id="123" data-type="button">some text</span>'

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      const span = container.querySelector('span[data-id="123"]')
      expect(span).toBeTruthy()
      expect(span?.getAttribute('data-type')).toBe('button')
      expect(span?.textContent).toBe('some text')
    })

    it('renders multiple elements with attributes', () => {
      const content =
        'Text <span data-id="1">first</span> and <span data-id="2">second</span>'

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      expect(container.querySelector('[data-id="1"]')).toBeTruthy()
      expect(container.querySelector('[data-id="2"]')).toBeTruthy()
    })

    it('preserves class attribute', () => {
      const content = '<span class="highlight">element</span>'

      const { container } = renderWithTheme(<Markdown>{content}</Markdown>)

      const span = container.querySelector('span.highlight')
      expect(span).toBeTruthy()
    })
  })
})

describe('validateSelfClosingTags', () => {
  it('allows void elements with self-closing syntax', () => {
    const content = '<br/><hr/><img src="test.png"/><input type="text"/>'
    expect(() => validateSelfClosingTags(content)).not.toThrow()
  })

  it('allows void elements with spaces before slash', () => {
    const content = '<br /><hr /><img src="test.png" />'
    expect(() => validateSelfClosingTags(content)).not.toThrow()
  })

  it('throws error for non-void self-closing tags', () => {
    const content = '<div/>'
    expect(() => validateSelfClosingTags(content)).toThrow(
      /Invalid self-closing tags found: <div\/>/,
    )
  })

  it('throws error for span self-closing tag', () => {
    const content = '<span data-id="123"/>'
    expect(() => validateSelfClosingTags(content)).toThrow(
      /Invalid self-closing tags found/,
    )
  })

  it('throws error for multiple invalid self-closing tags', () => {
    const content = '<div/><span/><p/>'
    expect(() => validateSelfClosingTags(content)).toThrow(
      /Invalid self-closing tags found: <div\/>, <span\/>, <p\/>/,
    )
  })

  it('allows content without any self-closing tags', () => {
    const content = '<div>content</div><span>text</span>'
    expect(() => validateSelfClosingTags(content)).not.toThrow()
  })

  it('allows mixed void and regular tags', () => {
    const content = '<div>text<br/>more text</div><img src="a.png"/>'
    expect(() => validateSelfClosingTags(content)).not.toThrow()
  })

  it('is case-insensitive for void elements', () => {
    const content = '<BR/><HR/><IMG src="test.png"/>'
    expect(() => validateSelfClosingTags(content)).not.toThrow()
  })
})
