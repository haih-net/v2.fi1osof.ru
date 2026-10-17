import { MemoryRouter } from 'react-router'
import { App } from 'app/Custom/components/pages/_App'
import { Meta, StoryObj } from '@storybook/react-vite'
import { Markdown } from './index'

const meta = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <App>
          <Story />
        </App>
      </MemoryRouter>
    ),
  ],
  title: 'Components/Markdown',
  component: Markdown,
  parameters: {
    // layout: 'centered',
  },
  args: {
    children: '',
  },
} satisfies Meta<typeof Markdown>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: '# Hello World\n\nThis is a markdown field.',
  },
}

export const EmptyField: Story = {
  args: {
    children: null,
  },
}

export const WithFormattedText: Story = {
  args: {
    children: `# Formatted Text

**Bold text**, *italic* and ~~strikethrough text~~.

## Lists

### Bulleted list:
- Item 1
- Item 2
  - Nested item
- Item 3

### Numbered list:
1. First item
2. Second item
3. Third item
`,
  },
}

export const WithLinks: Story = {
  args: {
    children: `# Links

[Regular link](https://example.com)

[Link with hover text](https://example.com "Example tooltip")

## Special links:

Phone: [+7 (999) 123-45-67](tel:+79991234567)

Email: [example@example.com](mailto:example@example.com)

## Internal links:

[Link to another page](/about)

<a href="#">Native HTML link</a>
`,
  },
}

export const WithCustomDirectives: Story = {
  args: {
    children: `# Custom Directives

:::note
This is a note with important information
:::

:::warning
Warning! Pay attention to this.
:::

:::info
Useful information for the user.
:::
`,
  },
}

export const WithReactComponents: Story = {
  args: {
    children: `# With React Components
 
`,
  },
}

export const WithTable: Story = {
  args: {
    children: `# Tables

## Simple table

| Name | Age | City |
| --- | ------- | ----- |
| Anna | 25 | Moscow |
| Ivan | 30 | Saint Petersburg |
| Maria | 27 | Kazan |

## Table with alignment

| Left | Center | Right |
| :--- | :---: | ---: |
| text | text | text |
| long text | short | 123 |
`,
  },
}

export const WithStrikethroughSubSup: Story = {
  args: {
    children: `# Strikethrough and Subscripts/Superscripts

~~Strikethrough text~~

Water formula: H<sub>2</sub>O

E = mc<sup>2</sup>

Combination: ~~old~~ **new** text with H<sub>2</sub>O
`,
  },
}

export const WithTaskList: Story = {
  args: {
    children: `# Task List

- [x] Task 1 completed
- [x] Task 2 completed
- [ ] Task 3 in progress
- [ ] Task 4 not started

## Nested tasks

- [x] Main task
  - [x] Subtask 1
  - [ ] Subtask 2
- [ ] Another task
`,
  },
}

export const WithHorizontalRule: Story = {
  args: {
    children: `# Horizontal Rules

Text before line

---

Text after line

***

Another section
`,
  },
}

export const ComplexExample: Story = {
  args: {
    children: `# Complex Example

## Text and formatting

This is regular text with **bold**, *italic* and \`inline code\` formatting.

~~Strikethrough text~~ and formula H<sub>2</sub>O with E = mc<sup>2</sup>

<mark>Highlighted text</mark>, <kbd>Ctrl</kbd> + <kbd>Enter</kbd> and <small>small text</small>.

## Links

[External link](https://example.com), [internal link](/) and [email](mailto:hello@example.com).

> This is a quote with **emphasis**, a [link](https://example.com) and \`inline code\`.
>
> Another paragraph to check the quote background and border.

---

## Table

| Name | Age | City |
| :--- | :---: | ---: |
| Anna | 25 | Moscow |
| Ivan | 30 | Saint Petersburg |
| Maria | 27 | Kazan |

| Element | Sample |
| --- | --- |
| Link | [Example](https://example.com) |
| Code | \`const value = 42\` |
| Emphasis | **Bold** and *italic* |

## Code

\`\`\`javascript
// Comments, keywords, strings and numbers should all remain readable.
const count = 42;

function hello() {
  console.log("Hello, world!");
}
\`\`\`

### Code without syntax highlighting

\`\`\`
Plain code block without syntax highlighting.
Check its text, background and border.
\`\`\`

## Lists

- Bullet with **bold text**
- Bullet with \`inline code\`
  - Nested item with a [link](https://example.com)

1. First numbered item
2. Second numbered item

## Math

Inline math: $E = mc^2$.

$$
a^2 + b^2 = c^2
$$

## Image

![Example image](https://via.placeholder.com/150)

## Task list

- [x] Task 1 completed
- [ ] Task 2 in progress
- [ ] Task 3 not started

---

\`\`\`env
LLAMA_MODEL=unsloth/Qwen3.5-4B-GGUF/Qwen3.5-4B-Q8_0.gguf
LLAMA_MMPROJ=unsloth/Qwen3.5-4B-GGUF/mmproj-F16.gguf
\`\`\`

\`\`\`ts
const jsxComponentDescriptors = useMemo<JsxComponentDescriptor[]>(() => {
  return [
    {
      name: 'files-uploader looooooong loooooooooooooooong loooooooooooooooooooooong text',
      kind: 'flow',
      props: [],
      hasChildren: true,
      Editor: FilesUploaderEditor,
    },
    {
      name: 'file',
      kind: 'text',
      props: [{ name: 'data-id', type: 'string' }],
      hasChildren: true,
      Editor: () => null,
    },
  ]
}, [])
\`\`\`


`,
  },
}

export const WithMermaid: Story = {
  args: {
    children: `# Mermaid Diagrams

## Flowchart

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Condition?}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant DB as Database
    U->>S: Data request
    S->>DB: SQL query
    DB-->>S: Result
    S-->>U: JSON response
\`\`\`

## Regular code nearby

\`\`\`javascript
const data = await fetch('/api/data')
console.log(data)
\`\`\`
`,
  },
}

export const WithLaTeX: Story = {
  args: {
    children: `# LaTeX Math Support

## Inline Math

The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ and Einstein's famous equation is $E = mc^2$.

Water formula: $H_2O$, and the Pythagorean theorem: $a^2 + b^2 = c^2$.

## Block Math

The integral of a function:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Maxwell's equations:

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
$$

$$
\\nabla \\times \\mathbf{B} - \\frac{1}{c^2}\\frac{\\partial \\mathbf{E}}{\\partial t} = \\mu_0 \\mathbf{J}
$$

## Matrix

$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix}
=
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}
$$

## Sum and Product

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

$$
\\prod_{i=1}^{n} i = n!
$$
`,
  },
}
