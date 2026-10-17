import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical'
import katex from 'katex'

export const TYPE_NAME = 'inline-math' as const

export type SerializedInlineMathNode = Spread<
  { type: typeof TYPE_NAME; value: string },
  SerializedLexicalNode
>

export class InlineMathNode extends DecoratorNode<React.JSX.Element> {
  __value: string

  static getType(): string {
    return TYPE_NAME
  }

  static clone(node: InlineMathNode): InlineMathNode {
    return new InlineMathNode(node.__value, node.__key)
  }

  getValue(): string {
    return this.__value
  }

  setValue(value: string): void {
    this.getWritable().__value = value
  }

  constructor(value: string, key?: NodeKey) {
    super(key)
    this.__value = value
  }

  createDOM(): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    return {
      element: new Text(`$${this.getValue()}$`),
    }
  }

  decorate(): React.JSX.Element {
    const html = katex.renderToString(this.__value, { throwOnError: false })
    return (
      <span
        className="katex-inline"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  static importJSON(serializedNode: SerializedInlineMathNode): InlineMathNode {
    return $createInlineMathNode(serializedNode.value)
  }

  exportJSON(): SerializedInlineMathNode {
    return {
      ...super.exportJSON(),
      type: TYPE_NAME,
      value: this.__value,
    }
  }

  isKeyboardSelectable(): boolean {
    return true
  }

  isInline(): boolean {
    return true
  }
}

export function $createInlineMathNode(value: string): InlineMathNode {
  return $applyNodeReplacement(new InlineMathNode(value))
}

export function $isInlineMathNode(
  node: LexicalNode | null | undefined,
): node is InlineMathNode {
  return node instanceof InlineMathNode
}
