import React, { useMemo, useRef } from 'react'
import { Link } from 'react-router'
import ReactMarkdown, {
  // AllowElement,
  Components,
  defaultUrlTransform,
  UrlTransform,
} from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypePrism from 'rehype-prism-plus'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katexStyles from 'katex/dist/katex.min.css?url'
import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'

import { Image } from 'app/Custom/components/Image'
import { Mermaid } from 'app/Custom/components/Mermaid'
import { MarkdownStyled } from './styles'
import { MarkdownFile } from './components/File'
import { MarkdownFilesList } from './components/MarkdownFilesList'

/**
 * Since version 9, remark has been nullifying tel and mailto links.
 * https://github.com/remarkjs/react-markdown/issues/829
 */
function rehypeUnwrapFilesUploader() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'files-uploader') {
        const extractFileElements = (
          children: typeof node.children,
        ): typeof node.children => {
          const result: typeof node.children = []

          for (const child of children) {
            if (child.type === 'element' && child.tagName === 'file') {
              result.push(child)
            } else if (child.type === 'element' && child.children) {
              result.push(...extractFileElements(child.children))
            }
          }

          return result
        }

        node.children = extractFileElements(node.children)
      }
    })
  }
}

const urlTransform: UrlTransform = (url, _name, _node) => {
  const fixed = defaultUrlTransform(url)

  // if scheme is tel/mailto — pass as is
  if (url.startsWith('tel:') || url.startsWith('mailto:')) {
    return url
  }
  return fixed
}

const createComponents = ({
  getContent,
}: {
  getContent: () => string | null | undefined
}): Components & {
  'files-uploader': React.FC<React.PropsWithChildren>
  file: React.FC<
    React.PropsWithChildren<{
      node?: {
        properties?: {
          dataId?: string
        }
      }
    }>
  >
} => ({
  a: ({ node: _node, href: hrefProps, ...props }) => {
    const href: string | undefined = hrefProps

    if (!href) {
      return <span {...props} />
    }

    const internal = href.startsWith('/') && !href.startsWith('//')
    return internal ? (
      <Link to={href} {...props} />
    ) : (
      <a
        href={href}
        {...props}
        target={/^https?:/.test(href) ? '_blank' : undefined}
        rel="noreferrer"
      />
    )
  },
  img: ({ node: _node, src, alt, ...props }) => {
    if (!src) {
      return null
    }

    return <Image src={String(src)} alt={alt ?? ''} {...props} />
  },
  pre: ({ node, children, ...props }) => {
    const codeElement = node?.children?.[0]
    if (
      codeElement?.type === 'element' &&
      codeElement.tagName === 'code' &&
      codeElement.properties?.className
    ) {
      const classNames = codeElement.properties.className as string[]
      const isMermaid = classNames?.some((c) => c === 'language-mermaid')

      if (isMermaid) {
        const content = getContent()
        const { start, end } = node?.position || {}

        if (
          content &&
          start?.offset !== undefined &&
          end?.offset !== undefined
        ) {
          const extracted = content.substring(start.offset, end.offset)
          const match = extracted
            .trim()
            .match(/^```mermaid\n?([\s\S]*?)\n?```$/)
          const source = match?.[1]?.trim() || ''

          if (source) {
            return <Mermaid source={source} />
          }
        }
      }
    }

    return <pre {...props}>{children}</pre>
  },
  'files-uploader': ({ children }) => {
    return <MarkdownFilesList>{children}</MarkdownFilesList>
  },
  file: ({ node, children }) => {
    const id = node?.properties?.dataId

    if (!id) {
      return null
    }

    return <MarkdownFile id={id} fileName={children} />
  },
})

// const allowElement: AllowElement = (element, index, parent) => {
//   return element.tagName !== 'img'
// }

type MarkdownProps = {
  children: string | null | undefined
  className?: string
}

export const Markdown: React.FC<MarkdownProps> = ({ children, ...other }) => {
  const childrenRef = useRef(children)
  childrenRef.current = children

  const components = useMemo(
    () => createComponents({ getContent: () => childrenRef.current }),
    [],
  )

  return children ? (
    <MarkdownStyled {...other}>
      <link rel="stylesheet" href={katexStyles} precedence="default" />
      <ReactMarkdown
        urlTransform={urlTransform}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={components}
        // allowElement={allowElement}
        rehypePlugins={[
          rehypeRaw,
          rehypeUnwrapFilesUploader,
          rehypeKatex,
          [rehypePrism, { ignoreMissing: true }],
        ]}
      >
        {children}
      </ReactMarkdown>
    </MarkdownStyled>
  ) : null
}
