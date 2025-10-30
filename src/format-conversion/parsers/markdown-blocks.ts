import { SerializedListNode } from '@lexical/list';
import { SerializedHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  HeadingTagType,
  SerializedHeadingNode,
  SerializedQuoteNode
} from '@lexical/rich-text';
import { SerializedElementNode, SerializedParagraphNode } from 'lexical';
import { KiwimeriLexicalBlockParser } from '../lexer';

const baseElementNode = (type: string): SerializedElementNode => {
  return {
    type,
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: []
  };
};

const endOfBlock = (nextBlock: string, strictParagraph = false) => {
  if (strictParagraph) {
    const endOfBlock = nextBlock.indexOf('\n\n');
    if (endOfBlock < 0) {
      return nextBlock;
    }
    return nextBlock.substring(0, endOfBlock + 2);
  } else {
    const endOfBlock = nextBlock.indexOf('\n');
    if (endOfBlock < 0) {
      return nextBlock;
    }
    if (nextBlock[endOfBlock + 1] === '\n') {
      return nextBlock.substring(0, endOfBlock + 2);
    }
    return nextBlock.substring(0, endOfBlock + 1);
  }
};

// TODO no need for predicates in parse anymore

const HEADING_REGEX = /^(#{1,6})/g;
const HEADING: KiwimeriLexicalBlockParser = {
  tokenize: nextBlock =>
    nextBlock.match(HEADING_REGEX) ? endOfBlock(nextBlock) : null,
  parse: token => {
    const heading = token.match(HEADING_REGEX);
    if (heading) {
      const node = baseElementNode('heading') as SerializedHeadingNode;
      node.tag = ('h' + heading[0].length) as HeadingTagType;
      return { node, text: token.replace(heading[0], '').trimStart() };
    }
    return null;
  }
};

const QUOTE_PREFIX = '>';
const QUOTE: KiwimeriLexicalBlockParser = {
  tokenize: nextBlock =>
    nextBlock.startsWith(QUOTE_PREFIX) ? endOfBlock(nextBlock) : null,
  parse: token => {
    if (token.startsWith(QUOTE_PREFIX)) {
      const node = baseElementNode('quote') as SerializedQuoteNode;
      return {
        node,
        text: token.replace(QUOTE_PREFIX, '').trimStart()
      };
    }
    return null;
  }
};

const HRULE_PREFIX = '---';
const HRULE: KiwimeriLexicalBlockParser = {
  tokenize: nextBlock =>
    nextBlock.startsWith(HRULE_PREFIX) ? endOfBlock(nextBlock) : null,
  parse: token => {
    if (token.startsWith(HRULE_PREFIX)) {
      return {
        node: {
          type: 'horizontalrule',
          version: 1
        } as SerializedHorizontalRuleNode,
        text: ''
      };
    }
    return null;
  }
};

const LIST_PREDICATE = (token: string) =>
  token.startsWith('- ') || token.match(/^\d+\. /g);
const LIST: KiwimeriLexicalBlockParser = {
  tokenize: nextBlock =>
    LIST_PREDICATE(nextBlock) ? endOfBlock(nextBlock, true) : null,
  parse: token => {
    const node = baseElementNode('list') as SerializedListNode;
    node.tag = token.startsWith('- ') ? 'ul' : 'ol';
    node.listType = token.startsWith('- ') ? 'bullet' : 'number';
    node.start = 1;
    return {
      node,
      text: token
    };
  }
};

const EMPTY_PARAGRAPH: KiwimeriLexicalBlockParser = {
  tokenize: nextBlock => {
    if (nextBlock.match(/^\n+/g)) return '\n';
    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) return endOfBlock(nextBlock);
    // try catching <p ...>\n</p>\n
    const pEl = nextBlock.match(/^<p [^>]*>(.*)\n+<\/p>\n+/g);
    if (pEl) {
      return pEl[0];
    }
    return null;
  },
  parse: token => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    if (token.match(/^\n+/g) || token.match(/^<p [^>]*><\/p>\n+/g)) {
      return {
        node,
        text: ''
      };
    }
    return null;
  }
};

export const PARAGRAPH: KiwimeriLexicalBlockParser = {
  tokenize: () => {
    return null;
  },
  parse: token => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    return {
      node,
      text: token
    };
  }
};

export const ALL_BLOCKS: KiwimeriLexicalBlockParser[] = [
  HEADING,
  QUOTE,
  HRULE,
  LIST,
  EMPTY_PARAGRAPH
];
