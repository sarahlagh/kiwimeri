import { SerializedListItemNode } from '@lexical/list';
import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  SerializedLineBreakNode,
  SerializedTextNode
} from 'lexical';
import { KiwimeriLexerResponse, KiwimeriLexicalElementParser } from '../lexer';
import { getTextAlign } from './markdown-blocks';

// const INDENTED_TEXT: KiwimeriLexicalElementParser = {
//   type: 'text',
//   tokenize: nextText =>
//     nextText.match(/^[ \t]+[^ \t\n]+/g) ? nextText.trimStart() : null
// };

const PLAIN_TEXT: KiwimeriLexicalElementParser = {
  name: 'plain_text',
  type: 'text',
  tokenize: nextText => {
    // regex to stop token at [*_~<\n] but not escaped [*_~<\n] (* will match but \* won't)
    const endOfText = nextText.match(/^(([\\][*_~<\n]|[^*_~<\n])*)[*_~<\n]/g);
    if (endOfText && endOfText.length > 0) {
      // remove trailing special chars BUT avoid escaped ones dammit
      return endOfText[0].replaceAll(/(\**|_*|~*|<*|\n*)$/g, '');
    }
    return nextText;
  },
  parse: (token, ctx) => {
    // // if previous text was linebreak in a list, remove indent
    const indent = token.match(/^[ \t]+[^ \t\n]+/g);
    if (
      ctx.lastBlock?.node.type === 'list' &&
      ctx.lastText?.node?.type === 'linebreak' &&
      indent
    ) {
      token = token.trimStart();
    }
    // unescape
    token = token.replaceAll(/\\([*_~<#])/g, '$1');
    const textNode: SerializedTextNode = {
      type: 'text',
      text: token,
      version: 1,
      format: ctx.getFormatUnion(),
      mode: 'normal',
      style: '',
      detail: 0
    };
    return textNode;
  }
};

const BOLD_PREDICATE = (nextText: string) =>
  nextText.startsWith('**') || nextText.startsWith('__');
const BOLD: KiwimeriLexicalElementParser = {
  name: 'bold',
  type: 'keyword',
  tokenize: nextText =>
    BOLD_PREDICATE(nextText) ? nextText.substring(0, 2) : null,
  matches: BOLD_PREDICATE,
  textFormat: IS_BOLD
};

const ITALIC_PREDICATE = (nextText: string) =>
  nextText.startsWith('*') || nextText.startsWith('_');
const ITALIC: KiwimeriLexicalElementParser = {
  name: 'italic',
  type: 'keyword',
  tokenize: nextText => (ITALIC_PREDICATE(nextText) ? nextText[0] : null),
  matches: ITALIC_PREDICATE,
  textFormat: IS_ITALIC
};

const STRIKETHROUGH_PREDICTATE = (nextText: string) =>
  nextText.startsWith('~~');
const STRIKETHROUGH: KiwimeriLexicalElementParser = {
  name: 'strikethrough',
  type: 'keyword',
  tokenize: nextText => (STRIKETHROUGH_PREDICTATE(nextText) ? '~~' : null),
  matches: STRIKETHROUGH_PREDICTATE,
  textFormat: IS_STRIKETHROUGH
};

const UNDERLINE_PREDICTATE = (nextText: string) =>
  nextText.startsWith('<u>') || nextText.startsWith('</u>');
const UNDERLINE: KiwimeriLexicalElementParser = {
  name: 'underline',
  type: 'keyword',
  tokenize: nextText => {
    if (nextText.startsWith('<u>')) return '<u>';
    if (nextText.startsWith('</u>')) return '</u>';
    return null;
  },
  matches: UNDERLINE_PREDICTATE,
  textFormat: IS_UNDERLINE
};

const TEXT_ALIGN: KiwimeriLexicalElementParser = {
  name: 'text_align',
  type: 'keyword',
  tokenize: nextText => {
    if (nextText.startsWith('</p>')) return '</p>';
    const pEl = nextText.match(/^<p[^>]*>/g);
    if (pEl) return pEl[0];
    return null;
  },
  parse: (token, ctx) => {
    if (token.startsWith('<p')) {
      const paragraphAlign = getTextAlign(token);
      if (paragraphAlign !== '') {
        ctx.paragraphAlign = paragraphAlign;
      }
    }
    if (token === '</p>') {
      ctx.paragraphAlign = '';
    }
    return null;
  }
};

const UNORDERED_LIST_ITEM: KiwimeriLexicalElementParser = {
  name: 'unordered_list_item',
  type: 'keyword',
  tokenize: (nextText, block, isStartOfLine) => {
    const unorderedList = nextText.match(/^- ?/g);
    if (unorderedList && isStartOfLine && block.text.startsWith('- ')) {
      return unorderedList[0];
    }
    return null;
  },
  propagateTextFormat: true,
  captures: (resp: KiwimeriLexerResponse) =>
    (resp.elemParser && BREAK_LIST_ITEMS_ELEMENTS.includes(resp.elemParser)) ||
    false,
  parse: (token, ctx) => {
    const listitem: SerializedListItemNode = {
      type: 'listitem',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0, // TODO deal with indent
      value: ctx.elements.filter(el => el.node?.type === 'listitem').length + 1,
      children: [],
      checked: undefined
    };
    delete listitem.checked;
    return listitem;
  }
};

const NUMBERED_LIST_ITEM: KiwimeriLexicalElementParser = {
  ...UNORDERED_LIST_ITEM,
  name: 'ordered_list_item',
  tokenize: (nextText, block, isStartOfLine) => {
    const numberedList = nextText.match(/^\d+\. /g);
    if (numberedList && isStartOfLine && block.text.match(/^\d+\. /g)) {
      return numberedList[0];
    }
    return null;
  }
};

const SIMPLE_LINEBREAK: KiwimeriLexicalElementParser = {
  name: 'linebreak',
  type: 'text',
  tokenize: nextText =>
    nextText.startsWith('\n') && !nextText.startsWith('\n\n') ? '\n' : null,
  parse: (token, ctx) => {
    // if linebreak, but in a list not followed by indent, ignore token
    if (
      ctx.lastBlock?.node.type === 'list' &&
      (ctx.nextText?.token.startsWith('-') ||
        ctx.nextText?.token.match(/^\d+\./g))
    ) {
      return null;
    }
    const node: SerializedLineBreakNode = {
      type: 'linebreak',
      version: 1
    };
    return node;
  }
};

const BREAK_LIST_ITEMS_ELEMENTS = [UNORDERED_LIST_ITEM, NUMBERED_LIST_ITEM];

// lexer order
export const ALL_ELEMENTS: KiwimeriLexicalElementParser[] = [
  BOLD,
  ITALIC,
  STRIKETHROUGH,
  UNDERLINE,
  TEXT_ALIGN,
  UNORDERED_LIST_ITEM,
  NUMBERED_LIST_ITEM,
  SIMPLE_LINEBREAK,
  // INDENTED_TEXT,
  PLAIN_TEXT
];
