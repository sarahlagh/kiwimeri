import { KiwimeriLexerResponseType } from '../lexer';
import { KiwimeriParserBlock } from '../parser-context';

type KiwimeriLexicalElement = {
  type: KiwimeriLexerResponseType;
  matches: (
    nextText: string,
    block: KiwimeriParserBlock,
    isStartOfLine: boolean
  ) => string | null;
};

const BOLD: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: nextText =>
    nextText.startsWith('**') || nextText.startsWith('__')
      ? nextText.substring(0, 2)
      : null
};

const ITALIC: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: nextText =>
    nextText.startsWith('*') || nextText.startsWith('_') ? nextText[0] : null
};

const STRIKETHROUGH: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: nextText => (nextText.startsWith('~~') ? '~~' : null)
};

const UNDERSCORE: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: nextText => {
    if (nextText.startsWith('<u>')) return '<u>';
    if (nextText.startsWith('</u>')) return '</u>';
    return null;
  }
};

const TEXT_ALIGN: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: nextText => {
    if (nextText.startsWith('</p>')) return '</p>';
    const pEl = nextText.match(/^<p[^>]*>/g);
    if (pEl) return pEl[0];
    return null;
  }
};

const UNORDERED_LIST: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: (nextText, block, isStartOfLine) => {
    const unorderedList = nextText.match(/^- ?/g);
    if (unorderedList && isStartOfLine && block.text.startsWith('- ')) {
      return unorderedList[0];
    }
    return null;
  }
};

const NUMBERED_LIST: KiwimeriLexicalElement = {
  type: 'keyword',
  matches: (nextText, block, isStartOfLine) => {
    const numberedList = nextText.match(/^\d+\. /g);
    if (numberedList && isStartOfLine && block.text.match(/^\d+\. /g)) {
      return numberedList[0];
    }
    return null;
  }
};

const SIMPLE_LINEBREAK: KiwimeriLexicalElement = {
  type: 'text',
  matches: nextText =>
    nextText.startsWith('\n') && !nextText.startsWith('\n\n') ? '\n' : null
};

export const ALL_ELEMENTS: KiwimeriLexicalElement[] = [
  BOLD,
  ITALIC,
  STRIKETHROUGH,
  UNDERSCORE,
  TEXT_ALIGN,
  UNORDERED_LIST,
  NUMBERED_LIST,
  SIMPLE_LINEBREAK
];
