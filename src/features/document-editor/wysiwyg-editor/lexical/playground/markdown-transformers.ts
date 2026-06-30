import {
  ELEMENT_TRANSFORMERS,
  ElementTransformer,
  CHECK_LIST as LEXICAL_CHECK_LIST,
  MULTILINE_ELEMENT_TRANSFORMERS,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  Transformer
} from '@lexical/markdown';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode
} from '@lexical/react/LexicalHorizontalRuleNode';
import { LexicalNode } from 'lexical';

export const HR: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => {
    return $isHorizontalRuleNode(node) ? '---' : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _1, _2, isImport) => {
    const line = $createHorizontalRuleNode();

    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }

    line.selectNext();
  },
  type: 'element'
};

export const CHECK_LIST: ElementTransformer = {
  ...LEXICAL_CHECK_LIST,
  // "- [" will be transformed into an unordered list
  // so this allows typing "-[ ]" without space
  regExp: /^(\s*)(?:[-*+]\s?)?\s?(\[(\s|x)?\])\s/i
};

export const MARKDOWN_SHORTCUTS_TRANSFORMERS: Array<Transformer> = [
  HR, // isn't HR in default transformers?
  CHECK_LIST,
  ...ELEMENT_TRANSFORMERS,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS
];
