import { MarkdownStyled } from 'app/Custom/components/Markdown/styles'
import { styled } from '@linaria/react'

export const MessageStyled = styled.div`
  max-width: 85%;
  padding: 14px 18px;
  border-radius: 20px;
  font-size: 0.9375rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  align-self: flex-start;
  background: #ffffff;
  color: #1f2937;
  border-bottom-left-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  &[data-user='true'] {
    align-self: flex-end;
    background: #3b82f6;
    color: #fff;
    border-bottom-right-radius: 6px;
    border-bottom-left-radius: 20px;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
    ${MarkdownStyled} {
      a {
        color: inherit;
      }

      code,
      kbd {
        color: #f8fafc;
        background: #1e3a8a;
        border-color: rgba(255, 255, 255, 0.3);
      }

      pre {
        color: #f8fafc;
        background: #0f172a;
        border-color: #475569;
      }

      pre code {
        color: inherit;
        background: transparent;
      }

      /* Light syntax colors on the user's dark code surface. */
      pre {
        .token {
          color: inherit;
        }

        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #94a3b8;
        }

        .token.punctuation {
          color: #e2e8f0;
        }

        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #93c5fd;
        }

        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #86efac;
        }

        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string,
        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #fda4af;
        }

        .token.function,
        .token.class-name {
          color: #c4b5fd;
        }

        .token.regex,
        .token.important,
        .token.variable {
          color: #fde68a;
        }
      }
    }
  }
`
