import {
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  SerializedTextNode
} from 'lexical';
import { KiwimeriLexicalElementParser } from '../lexer';

const PLAIN_TEXT: KiwimeriLexicalElementParser = {
  type: 'text',
  tokenize: nextText => {
    // regex to stop token at [*_~<\n] but not escaped [*_~<\n] (* will match but \* won't)
    const endOfText = nextText.match(/^(([\\][*_~<\n]|[^*_~<\n])*)[*_~<\n]/g);
    if (endOfText && endOfText.length > 0) {
      // remove trailing special chars BUT avoid escaped ones dammit
      return endOfText[0].replaceAll(/(\**|_*|~*|<*|\n*)$/g, '');
    }
    return null;
  },
  parse: (lexResponse, ctx) => {
    // unescape
    lexResponse.token = lexResponse.token.replaceAll(/\\([*_~<#])/g, '$1');
    const textNode: SerializedTextNode = {
      type: 'text',
      text: lexResponse.token,
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
  type: 'keyword',
  tokenize: nextText =>
    BOLD_PREDICATE(nextText) ? nextText.substring(0, 2) : null,
  matches: BOLD_PREDICATE,
  textFormat: IS_BOLD
};

const ITALIC_PREDICATE = (nextText: string) =>
  nextText.startsWith('*') || nextText.startsWith('_');
const ITALIC: KiwimeriLexicalElementParser = {
  type: 'keyword',
  tokenize: nextText => (ITALIC_PREDICATE(nextText) ? nextText[0] : null),
  matches: ITALIC_PREDICATE,
  textFormat: IS_ITALIC
};

const STRIKETHROUGH_PREDICTATE = (nextText: string) =>
  nextText.startsWith('~~');
const STRIKETHROUGH: KiwimeriLexicalElementParser = {
  type: 'keyword',
  tokenize: nextText => (STRIKETHROUGH_PREDICTATE(nextText) ? '~~' : null),
  matches: STRIKETHROUGH_PREDICTATE,
  textFormat: IS_STRIKETHROUGH
};

const UNDERLINE_PREDICTATE = (nextText: string) =>
  nextText.startsWith('<u>') || nextText.startsWith('</u>');
const UNDERLINE: KiwimeriLexicalElementParser = {
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
  type: 'keyword',
  tokenize: nextText => {
    if (nextText.startsWith('</p>')) return '</p>';
    const pEl = nextText.match(/^<p[^>]*>/g);
    if (pEl) return pEl[0];
    return null;
  }
};

const UNORDERED_LIST: KiwimeriLexicalElementParser = {
  type: 'keyword',
  tokenize: (nextText, block, isStartOfLine) => {
    const unorderedList = nextText.match(/^- ?/g);
    if (unorderedList && isStartOfLine && block.text.startsWith('- ')) {
      return unorderedList[0];
    }
    return null;
  }
};

const NUMBERED_LIST: KiwimeriLexicalElementParser = {
  type: 'keyword',
  tokenize: (nextText, block, isStartOfLine) => {
    const numberedList = nextText.match(/^\d+\. /g);
    if (numberedList && isStartOfLine && block.text.match(/^\d+\. /g)) {
      return numberedList[0];
    }
    return null;
  }
};

const SIMPLE_LINEBREAK: KiwimeriLexicalElementParser = {
  type: 'text',
  tokenize: nextText =>
    nextText.startsWith('\n') && !nextText.startsWith('\n\n') ? '\n' : null
};

// lexer order, parser can be reprioritized
export const ALL_ELEMENTS: KiwimeriLexicalElementParser[] = [
  BOLD,
  ITALIC,
  STRIKETHROUGH,
  UNDERLINE,
  TEXT_ALIGN,
  UNORDERED_LIST,
  NUMBERED_LIST,
  SIMPLE_LINEBREAK,
  PLAIN_TEXT
];
