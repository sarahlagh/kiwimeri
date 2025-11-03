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

/** strictParagraph: if true a paragraph ends with double \n */
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
  name: 'heading',
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
  name: 'quote',
  tokenize: nextBlock =>
    nextBlock.startsWith(QUOTE_PREFIX) ? endOfBlock(nextBlock) : null,
  parse: token => {
    const node = baseElementNode('quote') as SerializedQuoteNode;
    return {
      node,
      text: token.replace(QUOTE_PREFIX, '').trimStart()
    };
  }
};

const HRULE_PREFIX = '---';
const HRULE: KiwimeriLexicalBlockParser = {
  name: 'hrule',
  tokenize: nextBlock =>
    nextBlock.startsWith(HRULE_PREFIX) ? endOfBlock(nextBlock) : null,
  parse: () => {
    return {
      node: {
        type: 'horizontalrule',
        version: 1
      } as SerializedHorizontalRuleNode,
      text: ''
    };
  }
};

const LIST_PREDICATE = (token: string) =>
  token.startsWith('- ') || token.match(/^\d+\. /g);
const LIST: KiwimeriLexicalBlockParser = {
  name: 'list',
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

/* note: unable to make the difference between a shift-enter (produces linebreak) and enter (produces paragraph) */
const EMPTY_PARAGRAPH: KiwimeriLexicalBlockParser = {
  name: 'empty_paragraph',
  tokenize: nextBlock => {
    if (nextBlock.match(/^\n+/g)) return '\n';
    const emptyP = nextBlock.match(/^<p [^>]*>(\n)*<\/p>\n/g);
    if (emptyP) {
      return emptyP[0];
    }
    return null;
  },
  parse: token => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    if (token.match(/^<p [^>]*>(\n)*<\/p>\n+/g)) {
      return {
        node,
        text: token
      };
    }
    return {
      node,
      text: ''
    };
  }
};

export const PARAGRAPH: KiwimeriLexicalBlockParser = {
  name: 'paragraph',
  tokenize: nextBlock => endOfBlock(nextBlock, true),
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
  EMPTY_PARAGRAPH,
  PARAGRAPH
];
