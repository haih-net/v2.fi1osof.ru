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

export const TYPE_NAME = 'block-math' as const

export type SerializedBlockMathNode = Spread<
  { type: typeof TYPE_NAME; value: string },
  SerializedLexicalNode
>

export class BlockMathNode extends DecoratorNode<React.JSX.Element> {
  __value: string

  static getType(): string {
    return TYPE_NAME
  }

  static clone(node: BlockMathNode): BlockMathNode {
    return new BlockMathNode(node.__value, node.__key)
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
    return document.createElement('div')
  }

  updateDOM(): false {
    return false
  }

  exportDOM(): DOMExportOutput {
    return {
      element: new Text(`$$${this.getValue()}$$`),
    }
  }

  decorate(): React.JSX.Element {
    const html = katex.renderToString(this.__value, {
      throwOnError: false,
      displayMode: true,
    })
    return (
      <div className="katex-block" dangerouslySetInnerHTML={{ __html: html }} />
    )
  }

  static importJSON(serializedNode: SerializedBlockMathNode): BlockMathNode {
    return $createBlockMathNode(serializedNode.value)
  }

  exportJSON(): SerializedBlockMathNode {
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
    return false
  }
}

export function $createBlockMathNode(value: string): BlockMathNode {
  return $applyNodeReplacement(new BlockMathNode(value))
}

export function $isBlockMathNode(
  node: LexicalNode | null | undefined,
): node is BlockMathNode {
  return node instanceof BlockMathNode
}
