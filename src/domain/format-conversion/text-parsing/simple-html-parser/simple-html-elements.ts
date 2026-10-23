import type { SerializedListItemNode } from '@lexical/list';
import type { SerializedLineBreakNode, SerializedTextNode } from 'lexical';
// eslint-disable-next-line no-restricted-imports
import {
  IS_BOLD,
  IS_HIGHLIGHT,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE
} from '../../constants';
import type {
  KiwimeriLexerResponse,
  KiwimeriTextElementParser
} from '../types';
import { getStartTag } from './simple-html-blocks';
import { SimpleHtmlParserOpts } from './simple-html-parser';
import { HTML_CHAR_ENTITIES, HTML_CHAR_ENTITIES_KEYS } from './special-chars';

type O = SimpleHtmlParserOpts;

export const ESCAPE_CHARS = '<';

const STOP_TOKEN_REGEX = new RegExp(
  `^(([\\\\][${ESCAPE_CHARS}]|[^${ESCAPE_CHARS}])*)[${ESCAPE_CHARS}]`,
  'g'
);

const AVOID_ESCAPED_CHARS_REGEX = new RegExp(
  `(\\${ESCAPE_CHARS.split('').join('*|')}|\n*)$`,
  'g'
);

const UNESCAPE_REGEX = new RegExp(`\\\\([${ESCAPE_CHARS}])`, 'g');

function tokenizeTextFormat(text: string, htmlTagName: string) {
  if (!text.startsWith('<')) {
    return null;
  }
  const startTag = getStartTag(text, htmlTagName);
  if (startTag) {
    return startTag;
  }
  if (text.startsWith(`</${htmlTagName}`)) {
    return `</${htmlTagName}>`;
  }
  return null;
}

function tokenizeTextFormats(text: string, tags: string[]) {
  for (const tag of tags) {
    const token = tokenizeTextFormat(text, tag);
    if (token) {
      return token;
    }
  }
  return null;
}

const BOLD: KiwimeriTextElementParser<O> = {
  name: 'bold',
  type: 'keyword',
  tokenize: nextText => tokenizeTextFormats(nextText, ['b', 'strong']),
  textFormat: IS_BOLD
};

const ITALIC: KiwimeriTextElementParser<O> = {
  name: 'italic',
  type: 'keyword',
  tokenize: nextText => tokenizeTextFormats(nextText, ['i', 'em']),
  textFormat: IS_ITALIC
};

const STRIKETHROUGH: KiwimeriTextElementParser<O> = {
  name: 'strikethrough',
  type: 'keyword',
  tokenize: nextText => tokenizeTextFormats(nextText, ['strike']),
  textFormat: IS_STRIKETHROUGH
};

const UNDERLINE: KiwimeriTextElementParser<O> = {
  name: 'underline',
  type: 'keyword',
  tokenize: nextText => tokenizeTextFormats(nextText, ['u']),
  textFormat: IS_UNDERLINE
};

const HIGHLIGHT: KiwimeriTextElementParser<O> = {
  name: 'highlight',
  type: 'keyword',
  tokenize: nextText => tokenizeTextFormats(nextText, ['mark']),
  textFormat: IS_HIGHLIGHT
};

const PLAIN_TEXT: KiwimeriTextElementParser<O> = {
  name: 'plain_text',
  type: 'text',
  tokenize: nextText => {
    // regex to stop token at < but not escaped < (< will match but \< won't)
    const endOfText = nextText.match(STOP_TOKEN_REGEX);
    if (endOfText && endOfText.length > 0) {
      // remove trailing special chars BUT avoid escaped ones dammit
      return endOfText[0].replaceAll(AVOID_ESCAPED_CHARS_REGEX, '');
    }
    return nextText;
  },
  parse: (token, ctx) => {
    // unescape
    token = token.replaceAll(UNESCAPE_REGEX, '$1');
    HTML_CHAR_ENTITIES_KEYS.forEach(key => {
      token = token.replaceAll(key, HTML_CHAR_ENTITIES[key]);
    });

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

const _LINEBREAKS = ['<br />', '<br/>'];
const LINEBREAK: KiwimeriTextElementParser<O> = {
  name: 'linebreak',
  type: 'text',
  tokenize(nextText) {
    for (const candidate of _LINEBREAKS) {
      if (nextText.startsWith(candidate)) {
        return candidate;
      }
    }
    return null;
  },
  parse() {
    const node: SerializedLineBreakNode = {
      type: 'linebreak',
      version: 1
    };
    return node;
  }
};

const UNORDERED_LIST_ITEM: KiwimeriTextElementParser<O> = {
  name: 'unordered_list_item',
  type: 'keyword',
  tokenize: (nextText, block, isStartOfLine) => {
    const unorderedList = nextText.match(/^- ?/g);
    if (unorderedList && isStartOfLine && block.text.startsWith('-')) {
      return unorderedList[0];
    }
    return null;
  },
  captures: (resp: KiwimeriLexerResponse<O>) =>
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

const NUMBERED_LIST_ITEM: KiwimeriTextElementParser<O> = {
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

// lexer order
export const SIMPLE_HTML_ELEMENTS: KiwimeriTextElementParser<O>[] = [
  LINEBREAK,
  BOLD,
  ITALIC,
  STRIKETHROUGH,
  UNDERLINE,
  HIGHLIGHT,
  UNORDERED_LIST_ITEM,
  NUMBERED_LIST_ITEM,
  PLAIN_TEXT
];
