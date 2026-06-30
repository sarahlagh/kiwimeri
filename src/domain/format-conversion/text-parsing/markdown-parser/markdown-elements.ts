import { SerializedAutoLinkNode, SerializedLinkNode } from '@lexical/link';
import { SerializedListItemNode } from '@lexical/list';
import {
  IS_BOLD,
  IS_HIGHLIGHT,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  SerializedLineBreakNode,
  SerializedTextNode
} from 'lexical';
import { KiwimeriLexerResponse, KiwimeriTextElementParser } from '../types';
import { getTextAlign } from './markdown-blocks';
import { MarkdownParser } from './markdown-parser';

export const ESCAPE_CHARS = '*_~<=';
export const EXTENDED_ESCAPE_CHARS = '#>-'; // only necessary at the start of a line

const STOP_TOKEN_REGEX = new RegExp(
  `^(([\\\\][${ESCAPE_CHARS}\n]|[^${ESCAPE_CHARS}\n])*)[${ESCAPE_CHARS}\n]`,
  'g'
);

// same as old /(\**|_*|~*|<*|=*|\n*)$/g
const AVOID_ESCAPED_CHARS_REGEX = new RegExp(
  `(\\${ESCAPE_CHARS.split('').join('*|')}|\n*)$`,
  'g'
);

const UNESCAPE_REGEX = new RegExp(
  `\\\\([${ESCAPE_CHARS}${EXTENDED_ESCAPE_CHARS}])`,
  'g'
);

const PLAIN_TEXT: KiwimeriTextElementParser = {
  name: 'plain_text',
  type: 'text',
  tokenize: nextText => {
    // regex to stop token at [*_~<\n] but not escaped [*_~<\n] (* will match but \* won't)
    const endOfText = nextText.match(STOP_TOKEN_REGEX);
    if (endOfText && endOfText.length > 0) {
      // remove trailing special chars BUT avoid escaped ones dammit
      return endOfText[0].replaceAll(AVOID_ESCAPED_CHARS_REGEX, '');
    }
    return nextText;
  },
  parse: (token, ctx) => {
    // if previous text was linebreak in a list, remove indent
    // TODO remove this if from PLAIN_TEXT
    const indent = token.match(/^[ \t]+[^ \t\n]+/g);
    if (
      ctx.lastBlock?.node.type === 'list' &&
      ctx.lastText?.node?.type === 'linebreak' &&
      indent
    ) {
      token = token.trimStart();
    }
    // unescape
    token = token.replaceAll(UNESCAPE_REGEX, '$1');
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
const BOLD: KiwimeriTextElementParser = {
  name: 'bold',
  type: 'keyword',
  tokenize: nextText =>
    BOLD_PREDICATE(nextText) ? nextText.substring(0, 2) : null,
  matches: BOLD_PREDICATE,
  textFormat: IS_BOLD
};

const ITALIC_PREDICATE = (nextText: string) =>
  nextText.startsWith('*') || nextText.startsWith('_');
const ITALIC: KiwimeriTextElementParser = {
  name: 'italic',
  type: 'keyword',
  tokenize: nextText => (ITALIC_PREDICATE(nextText) ? nextText[0] : null),
  matches: ITALIC_PREDICATE,
  textFormat: IS_ITALIC
};

const STRIKETHROUGH_PREDICTATE = (nextText: string) =>
  nextText.startsWith('~~');
const STRIKETHROUGH: KiwimeriTextElementParser = {
  name: 'strikethrough',
  type: 'keyword',
  tokenize: nextText => (STRIKETHROUGH_PREDICTATE(nextText) ? '~~' : null),
  matches: STRIKETHROUGH_PREDICTATE,
  textFormat: IS_STRIKETHROUGH
};

const UNDERLINE_PREDICTATE = (nextText: string) =>
  nextText.startsWith('<u>') || nextText.startsWith('</u>');
const UNDERLINE: KiwimeriTextElementParser = {
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

const HIGHLIGHT_PREDICTATE = (nextText: string) =>
  nextText.startsWith('==') && !nextText.startsWith('===');
const HIGHLIGHT: KiwimeriTextElementParser = {
  name: 'highlight',
  type: 'keyword',
  tokenize: nextText => (HIGHLIGHT_PREDICTATE(nextText) ? '==' : null),
  matches: HIGHLIGHT_PREDICTATE,
  textFormat: IS_HIGHLIGHT
};

const TEXT_ALIGN: KiwimeriTextElementParser = {
  name: 'text_align',
  type: 'keyword',
  tokenize: nextText => {
    if (nextText.startsWith('</p>')) return '</p>';
    const pEl = nextText.match(/^<p [^>]*>/g);
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

const UNORDERED_LIST_ITEM: KiwimeriTextElementParser = {
  name: 'unordered_list_item',
  type: 'keyword',
  tokenize: (nextText, block, isStartOfLine) => {
    const unorderedList = nextText.match(/^- ?/g);
    if (unorderedList && isStartOfLine && block.text.startsWith('-')) {
      return unorderedList[0];
    }
    return null;
  },
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

export const CHECKED_LIST_ITEM_REGEX = /^-\s?\[([x\s]?)\]\s/gi;
const CHECKED_LIST_ITEM: KiwimeriTextElementParser = {
  ...UNORDERED_LIST_ITEM,
  name: 'checked_list_item',
  tokenize: (nextText, block, isStartOfLine) => {
    const checkedList = nextText.match(CHECKED_LIST_ITEM_REGEX);
    if (checkedList && isStartOfLine && block.text.startsWith('-')) {
      return checkedList[0];
    }
    return null;
  },
  parse: (token, ctx, lexer) => {
    const res = UNORDERED_LIST_ITEM.parse!(token, ctx, lexer);
    if (!res) return null;
    const listitem = res as SerializedListItemNode;
    const [, checked] = [...token.matchAll(CHECKED_LIST_ITEM_REGEX)][0];
    listitem.checked = checked.trim() !== '';
    return listitem;
  }
};

const NUMBERED_LIST_ITEM: KiwimeriTextElementParser = {
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

const SIMPLE_LINEBREAK: KiwimeriTextElementParser = {
  name: 'linebreak',
  type: 'text',
  tokenize: nextText =>
    nextText.startsWith('\n') && !nextText.startsWith('\n\n') ? '\n' : null,
  parse: (token, ctx) => {
    // if linebreak, but in a list not followed by indent, ignore token
    // TODO why for list but not quote?
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

const BREAK_LIST_ITEMS_ELEMENTS = [
  CHECKED_LIST_ITEM,
  UNORDERED_LIST_ITEM,
  NUMBERED_LIST_ITEM
];

const LINK_REGEX = /\[(.*)\]\((.*?)(?: ["'](.*)["'])?\)/g;
const LINK: KiwimeriTextElementParser = {
  name: 'link',
  type: 'text',
  tokenize: nextText => {
    const link = nextText.match(LINK_REGEX);
    if (link) {
      return link[0];
    }
    return null;
  },
  parse: token => {
    const [, text, url, title] = [...token.matchAll(LINK_REGEX)][0];
    const node: SerializedLinkNode = {
      type: 'link',
      version: 1,
      format: '',
      direction: 'ltr',
      indent: 0,
      url,
      title: title ? title : null,
      rel: 'noreferrer',
      target: null,
      children: []
    };
    const textNodes = new MarkdownParser().parseText(text);
    if (textNodes) {
      node.children = textNodes;
      return node;
    }
    return null;
  }
};

export const URL_REGEX =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)(?<![-.+():%])/;

export const EMAIL_REGEX =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const AUTOLINK_REGEX = new RegExp(
  `<?((?:${URL_REGEX.source})|(?:${EMAIL_REGEX.source}))>?`,
  'g'
);

const AUTOLINK: KiwimeriTextElementParser = {
  name: 'autolink',
  type: 'text',
  tokenize: nextText => {
    const autolink = nextText.match(AUTOLINK_REGEX);
    if (autolink) {
      return autolink[0];
    }
    return null;
  },
  parse: token => {
    const [, url] = [...token.matchAll(AUTOLINK_REGEX)][0];
    const isMail = token.match(EMAIL_REGEX);
    const node: SerializedAutoLinkNode = {
      type: 'autolink',
      version: 1,
      format: '',
      direction: 'ltr',
      indent: 0,
      url: !isMail ? url : `mailto:${url}`,
      rel: null,
      target: null,
      title: null,
      isUnlinked: !token.startsWith('<'),
      children: []
    };
    const textNode: SerializedTextNode = {
      type: 'text',
      version: 1,
      format: 0,
      text: url,
      detail: 0,
      mode: 'normal',
      style: ''
    };
    node.children.push(textNode);
    return node;
  }
};

// lexer order
export const MARKDOWN_ELEMENTS: KiwimeriTextElementParser[] = [
  BOLD,
  ITALIC,
  STRIKETHROUGH,
  UNDERLINE,
  HIGHLIGHT,
  TEXT_ALIGN,
  CHECKED_LIST_ITEM,
  UNORDERED_LIST_ITEM,
  NUMBERED_LIST_ITEM,
  SIMPLE_LINEBREAK,
  LINK,
  AUTOLINK,
  PLAIN_TEXT
];
