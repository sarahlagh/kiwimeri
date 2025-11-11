import { SerializedListNode } from '@lexical/list';
import { SerializedHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import {
  HeadingTagType,
  SerializedHeadingNode,
  SerializedQuoteNode
} from '@lexical/rich-text';
import {
  ElementFormatType,
  SerializedElementNode,
  SerializedParagraphNode
} from 'lexical';
import { KiwimeriTextBlockParser } from '../types';

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

const matches = (text: string, regex: RegExp, group = 0) => {
  const result = [...text.matchAll(regex)];
  if (result.length > 0 && result[0].length > group) {
    return result[0][group];
  }
  return null;
};

const HEADING_REGEX = /^(#{1,6}) /g;
const HEADING: KiwimeriTextBlockParser = {
  name: 'heading',
  tokenize: nextBlock =>
    nextBlock.match(HEADING_REGEX) ? endOfBlock(nextBlock, true) : null,
  parse: text => {
    const heading = matches(text, /^(#{1,6}) /gm);
    if (heading) {
      const node = baseElementNode('heading') as SerializedHeadingNode;
      node.tag = ('h' + (heading.length - 1)) as HeadingTagType;
      node.format = '';
      const blockData = { lvl: heading.length - 1 };
      return { node, text, blockData };
    }
    return null;
  },
  transformChild: (text, ctx, blockData) => {
    const lvl = (blockData as { lvl: number }).lvl;
    const transformed = text.replace('#'.repeat(lvl) + ' ', '');
    return transformed.length > 0 ? transformed : null;
  }
};

const QUOTE_REGEX = /^> (?:(?:.|\n)*?\n)(?:(?=>)|\n)/g;
const QUOTE_PREFIX = '> ';
const QUOTE: KiwimeriTextBlockParser = {
  name: 'quote',
  tokenize: nextBlock =>
    matches(nextBlock, QUOTE_REGEX) ||
    (nextBlock.startsWith(QUOTE_PREFIX) ? nextBlock : null), // catches end of text
  parse: text => {
    const node = baseElementNode('quote') as SerializedQuoteNode;
    return {
      node,
      text
    };
  },
  transformChild: (text, ctx) => {
    if (text === '\n') return text;
    if (ctx.indexInLine > 0) {
      return text.replace(QUOTE_PREFIX, '');
    }
    return text.replace(QUOTE_PREFIX, '').trimStart();
  }
};

const HRULE_PREFIX = '---';
const HRULE_PREFIX_ALT = '***';
const HRULE: KiwimeriTextBlockParser = {
  name: 'hrule',
  tokenize: nextBlock =>
    nextBlock.startsWith(HRULE_PREFIX) || nextBlock.startsWith(HRULE_PREFIX_ALT)
      ? endOfBlock(nextBlock)
      : null,
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
  token.match(/^-{1}/g) || token.match(/^\d+\. /g);
const LIST: KiwimeriTextBlockParser = {
  name: 'list',
  tokenize: nextBlock =>
    LIST_PREDICATE(nextBlock) ? endOfBlock(nextBlock, true) : null,
  parse: text => {
    const node = baseElementNode('list') as SerializedListNode;
    node.tag = text.startsWith('-') ? 'ul' : 'ol';
    node.listType = text.startsWith('-') ? 'bullet' : 'number';
    node.start = 1;
    return {
      node,
      text
    };
  }
};

/* note: unable to make the difference between a shift-enter (produces linebreak) and enter (produces paragraph) */
const EMPTY_PARAGRAPH: KiwimeriTextBlockParser = {
  name: 'empty_paragraph',
  tokenize: nextBlock => {
    if (nextBlock.match(/^\n+/g)) return '\n';
    return null;
  },
  parse: () => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    return {
      node,
      text: ''
    };
  }
};

export const getTextAlign = (token: string) => {
  const textAlign = /text-align: ([a-z]+);/g.exec(token);
  if (textAlign && textAlign.length > 0) {
    return textAlign[1] as ElementFormatType;
  }
  return '';
};

export const PARAGRAPH: KiwimeriTextBlockParser = {
  name: 'paragraph',
  tokenize: nextBlock => {
    return endOfBlock(nextBlock, true);
  },
  parse: text => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.format = '';
    node.textFormat = 0;
    node.textStyle = '';
    return {
      node,
      text
    };
  }
};

export const ALL_BLOCKS: KiwimeriTextBlockParser[] = [
  HEADING,
  QUOTE,
  HRULE,
  LIST,
  EMPTY_PARAGRAPH,
  PARAGRAPH
];
