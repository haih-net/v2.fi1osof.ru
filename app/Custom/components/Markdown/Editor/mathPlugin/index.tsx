import {
  addExportVisitor$,
  addImportVisitor$,
  addLexicalNode$,
  addMdastExtension$,
  addSyntaxExtension$,
  addToMarkdownExtension$,
  realmPlugin,
  type LexicalExportVisitor,
  type MdastImportVisitor,
} from '@mdxeditor/editor'
import {
  mathFromMarkdown,
  mathToMarkdown,
  type InlineMath,
  type Math,
} from 'mdast-util-math'
import { math } from 'micromark-extension-math'
import {
  $createInlineMathNode,
  $isInlineMathNode,
  InlineMathNode,
} from './InlineMathNode'
import {
  $createBlockMathNode,
  $isBlockMathNode,
  BlockMathNode,
} from './BlockMathNode'

const MdastInlineMathVisitor: MdastImportVisitor<InlineMath> = {
  testNode: (node) => {
    return node.type === 'inlineMath'
  },

  visitNode({ mdastNode, actions }) {
    actions.addAndStepInto($createInlineMathNode(mdastNode.value))
  },
}

const MdastBlockMathVisitor: MdastImportVisitor<Math> = {
  testNode: (node) => {
    return node.type === 'math'
  },

  visitNode({ mdastNode, actions }) {
    actions.addAndStepInto($createBlockMathNode(mdastNode.value))
  },
}

const LexicalInlineMathVisitor: LexicalExportVisitor<
  InlineMathNode,
  InlineMath
> = {
  testLexicalNode: $isInlineMathNode,
  visitLexicalNode({ actions, mdastParent, lexicalNode }) {
    actions.appendToParent(mdastParent, {
      type: 'inlineMath',
      value: lexicalNode.getValue(),
    })
  },
}

const LexicalBlockMathVisitor: LexicalExportVisitor<BlockMathNode, Math> = {
  testLexicalNode: $isBlockMathNode,
  visitLexicalNode({ actions, mdastParent, lexicalNode }) {
    actions.appendToParent(mdastParent, {
      type: 'math',
      value: lexicalNode.getValue(),
    })
  },
}

export const mathPlugin = realmPlugin({
  init: (realm) => {
    realm.pubIn({
      [addSyntaxExtension$]: math(),
      [addMdastExtension$]: mathFromMarkdown(),
      [addToMarkdownExtension$]: mathToMarkdown(),
      [addImportVisitor$]: [MdastInlineMathVisitor, MdastBlockMathVisitor],
      [addExportVisitor$]: [LexicalInlineMathVisitor, LexicalBlockMathVisitor],
      [addLexicalNode$]: [InlineMathNode, BlockMathNode],
    })
  },
})
