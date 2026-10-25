import type { SerializedAutoLinkNode, SerializedLinkNode } from '@lexical/link';
import type { SerializedListItemNode, SerializedListNode } from '@lexical/list';
import type { SerializedLineBreakNode, SerializedTextNode } from 'lexical';
// eslint-disable-next-line no-restricted-imports
import {
  IS_BOLD,
  IS_HIGHLIGHT,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE
} from '../../constants';
import { EMAIL_REGEX } from '../markdown-parser/markdown-elements';
import { KiwimeriParserContext } from '../parser-context';
import type { KiwimeriTextElementParserBase } from '../types';
import { getTextAlign } from './simple-html-blocks';
import { SimpleHtmlParserOpts } from './simple-html-parser';

type O = SimpleHtmlParserOpts;

function newTextNode(text: string, ctx: KiwimeriParserContext<O>) {
  const textNode: SerializedTextNode = {
    type: 'text',
    text,
    version: 1,
    format: ctx.getFormatUnion(),
    mode: 'normal',
    style: '',
    detail: 0
  };
  return textNode;
}

const BOLD: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'bold',
  parse(el, ctx) {
    if (el.nodeType === Node.TEXT_NODE) return null;
    if (el.nodeName !== 'B' && el.nodeName !== 'STRONG') return null;
    ctx.activeFormats.add(IS_BOLD);
    return null;
  },
  hasSiblings(el: ChildNode) {
    if (el.nodeName !== 'B' && el.nodeName !== 'STRONG') return false;
    return true;
  },
  postParse: ctx => ctx.removeFormat(IS_BOLD)
};

const ITALIC: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'italic',
  parse(el, ctx) {
    if (el.nodeType === Node.TEXT_NODE) return null;
    if (el.nodeName !== 'I' && el.nodeName !== 'EM') return null;
    ctx.activeFormats.add(IS_ITALIC);
    return null;
  },
  hasSiblings(el: ChildNode) {
    if (el.nodeName !== 'I' && el.nodeName !== 'EM') return false;
    return true;
  },
  postParse: ctx => ctx.removeFormat(IS_ITALIC)
};

const STRIKETHROUGH: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'strikethrough',
  parse(el, ctx) {
    if (el.nodeType === Node.TEXT_NODE) return null;
    if (el.nodeName !== 'STRIKE') return null;
    ctx.activeFormats.add(IS_STRIKETHROUGH);
    return null;
  },
  hasSiblings(el: ChildNode) {
    if (el.nodeName !== 'STRIKE') return false;
    return true;
  },
  postParse: ctx => ctx.removeFormat(IS_STRIKETHROUGH)
};

const UNDERLINE: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'underline',
  parse(el, ctx) {
    if (el.nodeType === Node.TEXT_NODE) return null;
    if (el.nodeName !== 'U') return null;
    ctx.activeFormats.add(IS_UNDERLINE);
    return null;
  },
  hasSiblings(el: ChildNode) {
    if (el.nodeName !== 'U') return false;
    return true;
  },
  postParse: ctx => ctx.removeFormat(IS_UNDERLINE)
};

const HIGHLIGHT: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'highlight',
  parse(el, ctx) {
    if (el.nodeType === Node.TEXT_NODE) return null;
    if (el.nodeName !== 'MARK') return null;
    ctx.activeFormats.add(IS_HIGHLIGHT);
    return null;
  },
  hasSiblings(el: ChildNode) {
    if (el.nodeName !== 'MARK') return false;
    return true;
  },
  postParse: ctx => ctx.removeFormat(IS_HIGHLIGHT)
};

const LINEBREAK: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'bold',
  parse(el) {
    if (el.nodeType === Node.TEXT_NODE) return null;
    if (el.nodeName !== 'BR') return null;
    const node: SerializedLineBreakNode = {
      type: 'linebreak',
      version: 1
    };
    return node;
  }
};

const PLAIN_TEXT: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'plain_text',
  parse(el, ctx) {
    if (el.nodeType !== Node.TEXT_NODE) return null;
    return newTextNode(el.textContent || '', ctx);
  }
};

function baseListItemNode(
  ctx: KiwimeriParserContext<O>
): SerializedListItemNode {
  return {
    type: 'listitem',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0, // TODO deal with indent
    value: ctx.elements.filter(el => el.node?.type === 'listitem').length + 1,
    children: [],
    checked: undefined
  };
}
const UNORDERED_LIST_ITEM: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'unordered_list_item',
  parse(el, ctx) {
    if (el.nodeName !== 'LI' || !ctx.lastBlock) return null;
    const lastBlockNode = ctx.lastBlock.node as SerializedListNode;
    if (lastBlockNode.type !== 'list' || lastBlockNode.listType !== 'bullet') {
      return null;
    }
    const listitem = baseListItemNode(ctx);
    listitem.format = getTextAlign(el as HTMLLIElement);
    if (listitem.format === '' && el.parentElement) {
      listitem.format = getTextAlign(el.parentElement);
    }
    delete listitem.checked;
    return listitem;
  },
  captures: () => true
};

const CHECKED_LIST_ITEM: KiwimeriTextElementParserBase<ChildNode, O> = {
  ...UNORDERED_LIST_ITEM,
  name: 'checked_list_item',
  parse(el, ctx) {
    if (el.nodeName !== 'LI' || !ctx.lastBlock) return null;
    const lastBlockNode = ctx.lastBlock.node as SerializedListNode;
    if (lastBlockNode.type !== 'list' || lastBlockNode.listType !== 'check') {
      return null;
    }
    (el as HTMLLIElement).hasAttribute('checked');
    const listitem = baseListItemNode(ctx);
    const liEl = el as HTMLLIElement;
    listitem.checked =
      liEl.hasAttribute('checked') && liEl.getAttribute('checked') !== 'false';
    listitem.format = getTextAlign(liEl);
    if (listitem.format === '' && el.parentElement) {
      listitem.format = getTextAlign(el.parentElement);
    }
    return listitem;
  }
};

const NUMBERED_LIST_ITEM: KiwimeriTextElementParserBase<ChildNode, O> = {
  ...UNORDERED_LIST_ITEM,
  name: 'ordered_list_item',
  parse(el, ctx) {
    if (el.nodeName !== 'LI' || !ctx.lastBlock) return null;
    const lastBlockNode = ctx.lastBlock.node as SerializedListNode;
    if (lastBlockNode.type !== 'list' || lastBlockNode.listType !== 'number') {
      return null;
    }
    const listitem = baseListItemNode(ctx);
    listitem.format = getTextAlign(el as HTMLLIElement);
    if (listitem.format === '' && el.parentElement) {
      listitem.format = getTextAlign(el.parentElement);
    }
    delete listitem.checked;
    return listitem;
  }
};

const LINK: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'link',
  parse: (el, ctx) => {
    if (el.nodeName !== 'A') return null;
    const linkEl = el as HTMLAnchorElement;
    const url = linkEl.getAttribute('href') || '';
    const title = linkEl.getAttribute('title');
    const node: SerializedLinkNode = {
      type: 'link',
      version: 1,
      format: '',
      direction: 'ltr',
      indent: 0,
      url,
      title,
      rel: ctx.opts?.relAsNoReferrer !== false ? 'noreferrer' : null,
      target: null,
      children: []
    };
    return node;
  },
  captures: () => true
};

const AUTOLINK: KiwimeriTextElementParserBase<ChildNode, O> = {
  name: 'autolink',
  parse: el => {
    if (el.nodeName !== 'AUTOLINK') return null;
    const htmlEl = el as HTMLElement;
    const url = el.textContent || '';
    const isUnlinked =
      htmlEl.getAttribute('unlinked') === '' ||
      htmlEl.getAttribute('unlinked') === 'true';
    const isMail = url.match(EMAIL_REGEX);
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
      isUnlinked,
      children: []
    };
    return node;
  },
  captures: () => true
};

// lexer order
export const SIMPLE_HTML_ELEMENTS = [
  LINEBREAK,
  BOLD,
  ITALIC,
  STRIKETHROUGH,
  UNDERLINE,
  HIGHLIGHT,
  UNORDERED_LIST_ITEM,
  CHECKED_LIST_ITEM,
  NUMBERED_LIST_ITEM,
  LINK,
  AUTOLINK,
  PLAIN_TEXT
];

// TODO use
export const KNOWN_ELEMENT_HTML_TAGS = new Map<
  string,
  KiwimeriTextElementParserBase<ChildNode, O>
>();
KNOWN_ELEMENT_HTML_TAGS.set('BR', LINEBREAK);
KNOWN_ELEMENT_HTML_TAGS.set('B', BOLD);
KNOWN_ELEMENT_HTML_TAGS.set('STRONG', BOLD);
KNOWN_ELEMENT_HTML_TAGS.set('I', ITALIC);
KNOWN_ELEMENT_HTML_TAGS.set('EM', ITALIC);
KNOWN_ELEMENT_HTML_TAGS.set('STRIKE', STRIKETHROUGH);
KNOWN_ELEMENT_HTML_TAGS.set('U', UNDERLINE);
KNOWN_ELEMENT_HTML_TAGS.set('MARK', HIGHLIGHT);
KNOWN_ELEMENT_HTML_TAGS.set('A', LINK);
KNOWN_ELEMENT_HTML_TAGS.set('AUTOLINK', AUTOLINK);
