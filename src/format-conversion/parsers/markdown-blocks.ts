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

const matches = (text: string, regex: RegExp) => {
  const result = [...text.matchAll(regex)];
  if (result.length > 0) {
    return result[0][0];
  }
  return null;
};

const HEADING_REGEX = /^(#{1,6}) /g;
const HEADING: KiwimeriLexicalBlockParser = {
  name: 'heading',
  tokenize: nextBlock =>
    nextBlock.match(HEADING_REGEX) ? endOfBlock(nextBlock, true) : null,
  parse: (text, ctx) => {
    const heading = matches(text, /^(#{1,6}) /gm);
    if (heading) {
      const node = baseElementNode('heading') as SerializedHeadingNode;
      node.tag = ('h' + (heading.length - 1)) as HeadingTagType;
      node.format = ctx?.paragraphAlign || '';
      const blockData = { lvl: heading.length - 1 };
      return { node, text, blockData };
    }
    return null;
  },
  transformChild: (text, blockData) => {
    const lvl = (blockData as { lvl: number }).lvl;
    return text.replace('#'.repeat(lvl) + ' ', '');
  }
};

const QUOTE_REGEX = /^> (?:(?:.|\n)*?\n)(?:(?=>)|\n)/g;
const QUOTE_PREFIX = '> ';
const QUOTE: KiwimeriLexicalBlockParser = {
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
  transformChild: text => {
    if (text === '\n') return text;
    return text.replace(QUOTE_PREFIX, '').trimStart();
  }
};

const HRULE_PREFIX = '---';
const HRULE_PREFIX_ALT = '***';
const HRULE: KiwimeriLexicalBlockParser = {
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
  token.startsWith('- ') || token.match(/^\d+\. /g);
const LIST: KiwimeriLexicalBlockParser = {
  name: 'list',
  tokenize: nextBlock =>
    LIST_PREDICATE(nextBlock) ? endOfBlock(nextBlock, true) : null,
  parse: text => {
    const node = baseElementNode('list') as SerializedListNode;
    node.tag = text.startsWith('- ') ? 'ul' : 'ol';
    node.listType = text.startsWith('- ') ? 'bullet' : 'number';
    node.start = 1;
    return {
      node,
      text
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
  parse: text => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    if (text.match(/^<p [^>]*>(\n)*<\/p>\n+/g)) {
      return {
        node,
        text
      };
    }
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

// TODO
// so if \n</p> -> \n and </p> counts as </p>
// if not (inline </p>) -> \n\n
// and then there's quotes => > <p ...></p>
// and lists!!! not handling listitems currently
// better to handle it all in one place
// wouldn't it be easier to do ## <p>....</p> for heading...

// so remove the <p></p> at block level => no element for text align
// or remove the block, only keep element for text-align -> what i was doing before

const IS_TEXT_ALIGN = /^<p[^>]*>((?:.|\n)*?)<\/p>\n\n/g;
// const IS_TEXT_ALIGN = /^<p[^>]*>((?:.|\n)*?)\n<\/p>\n/g;
const IS_FALSE_TEXT_ALIGN = /^<p[^>]*>((?:.|\n)*?)<\/p>[^\n]/g;
const IS_HEADING_TEXT_ALIGN = /^<p[^>]*>\n(#{1,6} .*\n)<\/p>\n/g;
// const IS_QUOTE_TEXT_ALIGN = /^<p[^>]*>\n(#{1,6} .*\n)<\/p>\n/g;
const TEXT_ALIGN_BLOCK: KiwimeriLexicalBlockParser = {
  name: 'text_align_block',
  tokenize: nextBlock => {
    const isTextAlign = IS_TEXT_ALIGN.exec(nextBlock);
    if (isTextAlign && isTextAlign.length > 0) {
      const isHeading = IS_HEADING_TEXT_ALIGN.exec(nextBlock);
      if (isHeading && isHeading.length > 0) {
        return isHeading[0];
      }
      return isTextAlign[0];
    }
    return null;
  },
  parse: token => {
    const ctx = {
      paragraphAlign: getTextAlign(token)
    };
    const isHeading = IS_HEADING_TEXT_ALIGN.exec(token);
    if (isHeading && isHeading.length > 0) {
      return HEADING.parse(isHeading[1], ctx);
    }
    const isTextAlign = IS_TEXT_ALIGN.exec(token);
    if (isTextAlign && isTextAlign.length > 0) {
      return PARAGRAPH.parse(isTextAlign[1], ctx);
    }
    return PARAGRAPH.parse(token, ctx);
  }
};

export const PARAGRAPH: KiwimeriLexicalBlockParser = {
  name: 'paragraph',
  tokenize: nextBlock => {
    return endOfBlock(nextBlock, true);
  },
  parse: (text, ctx) => {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.format = ctx?.paragraphAlign || '';
    node.textFormat = 0;
    node.textStyle = '';
    return {
      node,
      text
    };
  }
};

export const ALL_BLOCKS: KiwimeriLexicalBlockParser[] = [
  HEADING,
  QUOTE,
  HRULE,
  LIST,
  TEXT_ALIGN_BLOCK,
  EMPTY_PARAGRAPH,
  PARAGRAPH
];
