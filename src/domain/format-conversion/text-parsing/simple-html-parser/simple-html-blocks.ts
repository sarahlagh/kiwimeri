import type { SerializedListNode } from '@lexical/list';
import type { SerializedHorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import type {
  HeadingTagType,
  SerializedHeadingNode,
  SerializedQuoteNode
} from '@lexical/rich-text';
import type {
  ElementFormatType,
  SerializedElementNode,
  SerializedParagraphNode
} from 'lexical';
import type { KiwimeriTextBlockParserBase } from '../types';

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

export function getTextAlign(el: Element): ElementFormatType {
  if (el.hasAttribute('style')) {
    const token = el.getAttribute('style')!;
    const textAlign = /text-align: ([a-z]+);?/g.exec(token);
    if (textAlign && textAlign.length > 0) {
      return textAlign[1] as ElementFormatType;
    }
  }
  return '';
}

const HEADING: KiwimeriTextBlockParserBase<Element> = {
  name: 'heading',
  parse: el => {
    const node = baseElementNode('heading') as SerializedHeadingNode;
    node.tag = el.tagName.toLowerCase() as HeadingTagType;
    node.format = '';
    node.format = getTextAlign(el);
    return { node, text: el.textContent };
  }
};

const QUOTE: KiwimeriTextBlockParserBase<Element> = {
  name: 'quote',
  parse: el => {
    const node = baseElementNode('quote') as SerializedQuoteNode;
    node.format = getTextAlign(el);
    return {
      node,
      text: el.textContent
    };
  }
};

const HRULE: KiwimeriTextBlockParserBase<Element> = {
  name: 'hrule',
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

const LIST: KiwimeriTextBlockParserBase<Element> = {
  name: 'list',
  parse: el => {
    const node = baseElementNode('list') as SerializedListNode;
    const tag = el.tagName.toLowerCase();
    if (tag === 'ul') {
      node.tag = 'ul';
      node.listType = 'bullet';
    } else if (tag === 'ol') {
      node.tag = 'ol';
      node.listType = 'number';
    } else if (tag === 'checked') {
      node.tag = 'ul';
      node.listType = 'check';
    }
    node.start = 1;
    return {
      node,
      text: el.textContent
    };
  }
};

export const PARAGRAPH: KiwimeriTextBlockParserBase<Element> = {
  name: 'paragraph',
  parse(el) {
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    node.format = getTextAlign(el);
    return { node, text: el.textContent };
  }
};

export const KNOWN_TOP_LEVEL_HTML_TAGS = new Map<
  string,
  KiwimeriTextBlockParserBase<Element>
>();
KNOWN_TOP_LEVEL_HTML_TAGS.set('p', PARAGRAPH);
KNOWN_TOP_LEVEL_HTML_TAGS.set('H1', HEADING);
KNOWN_TOP_LEVEL_HTML_TAGS.set('H2', HEADING);
KNOWN_TOP_LEVEL_HTML_TAGS.set('H3', HEADING);
KNOWN_TOP_LEVEL_HTML_TAGS.set('H4', HEADING);
KNOWN_TOP_LEVEL_HTML_TAGS.set('H5', HEADING);
KNOWN_TOP_LEVEL_HTML_TAGS.set('H6', HEADING);
KNOWN_TOP_LEVEL_HTML_TAGS.set('BLOCKQUOTE', QUOTE);
KNOWN_TOP_LEVEL_HTML_TAGS.set('HR', HRULE);
KNOWN_TOP_LEVEL_HTML_TAGS.set('UL', LIST);
KNOWN_TOP_LEVEL_HTML_TAGS.set('OL', LIST);
KNOWN_TOP_LEVEL_HTML_TAGS.set('CHECKED', LIST);
