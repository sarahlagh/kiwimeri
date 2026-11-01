import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode
} from '@lexical/extension';
import {
  ELEMENT_TRANSFORMERS,
  ElementTransformer,
  MultilineElementTransformer,
  registerMarkdownShortcuts,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  TextFormatTransformer,
  TextMatchTransformer
} from '@lexical/markdown';
import { defineExtension, LexicalNode } from 'lexical';

type Transformer =
  | ElementTransformer
  | MultilineElementTransformer
  | TextFormatTransformer
  | TextMatchTransformer;

const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '***' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    // TODO: Get rid of isImport flag
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  triggerOnEnter: true,
  type: 'element'
};

export const TRANSFORMERS: Transformer[] = [
  HR,
  ...ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS
];

export const MarkdownShortcutsExtension = defineExtension({
  name: '@lexical/examples/dom-import/MarkdownShortcuts',
  register: editor => registerMarkdownShortcuts(editor, TRANSFORMERS)
});
