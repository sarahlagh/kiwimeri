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
import type { KiwimeriTextBlockParser } from '../types';
import { SimpleHtmlParserOpts } from './simple-html-parser';

type O = SimpleHtmlParserOpts;

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

export const endOfBlock = (nextBlock: string, closingTag: string) => {
  const endOfBlock = nextBlock.indexOf(closingTag);
  if (endOfBlock < 0) {
    console.error('block missing closing tag', closingTag, nextBlock);
    throw new Error('block missing closing tag: ' + closingTag);
  }
  return nextBlock.substring(0, endOfBlock + closingTag.length);
};

export function getStartTag(nextBlock: string, htmlTagName: string) {
  const startExpr = new RegExp(`^<${htmlTagName} ?[^>]*>`, 'g');
  const pEl = nextBlock.match(startExpr);
  if (pEl) return pEl[0];
  return null;
}

function tokenizeHtmlTag(nextBlock: string, htmlTagName: string | string[]) {
  if (!nextBlock.startsWith('<')) {
    throw new Error('block must start with a html tag');
  }
  if (Array.isArray(htmlTagName)) {
    for (const tag of htmlTagName) {
      const startTag = getStartTag(nextBlock, tag);
      if (startTag) {
        return endOfBlock(nextBlock, `</${tag}>`);
      }
    }
  } else {
    const startTag = getStartTag(nextBlock, htmlTagName);
    if (startTag) {
      return endOfBlock(nextBlock, `</${htmlTagName}>`);
    }
  }
  return null;
}

const matches = (text: string, regex: RegExp, group = 0) => {
  const result = [...text.matchAll(regex)];
  if (result.length > 0 && result[0].length > group) {
    return result[0][group];
  }
  return null;
};

export const getTextAlign = (token: string) => {
  const textAlign = /"text-align: ([a-z]+);?"/g.exec(token);
  if (textAlign && textAlign.length > 0) {
    return textAlign[1] as ElementFormatType;
  }
  return '';
};

type BlockData = { startTag: string; closingTag: string };

const HEADING: KiwimeriTextBlockParser<O> = {
  name: 'heading',
  tokenize: nextBlock =>
    tokenizeHtmlTag(nextBlock, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
  parse: text => {
    const heading = matches(text, /^<h(\d{1,6})[^>]*>/gm, 1);
    if (heading) {
      const node = baseElementNode('heading') as SerializedHeadingNode;
      const paragraphAlign = getTextAlign(text);
      const htmlTag = 'h' + heading;
      const startTag = getStartTag(text, htmlTag)!;
      node.tag = htmlTag as HeadingTagType;
      node.format = '';
      node.format = paragraphAlign;
      const blockData = {
        startTag,
        closingTag: `</${htmlTag}>`,
        lvl: heading.length - 1
      };
      return { node, text, blockData };
    }
    return null;
  },
  preTokenizeChild(block) {
    const { startTag, closingTag } = block.blockData as BlockData;
    block.text = block.text.replace(startTag, '').replace(closingTag, '');
  }
};

const QUOTE: KiwimeriTextBlockParser<O> = {
  name: 'quote',
  tokenize: nextBlock => tokenizeHtmlTag(nextBlock, 'blockquote'),
  parse: text => {
    const node = baseElementNode('quote') as SerializedQuoteNode;
    const paragraphAlign = getTextAlign(text);
    const startTag = getStartTag(text, 'blockquote')!;
    node.format = paragraphAlign;
    return {
      node,
      text,
      blockData: { startTag, closingTag: '</blockquote>' }
    };
  },
  preTokenizeChild(block) {
    const { startTag, closingTag } = block.blockData as BlockData;
    // TODO: if there are <p> in there, parse them like paragraphs
    block.text = block.text.replace(startTag, '').replace(closingTag, '');
  }
};

const _HRULE = ['<hr />', '<hr/>'];
const HRULE: KiwimeriTextBlockParser<O> = {
  name: 'hrule',
  tokenize: nextBlock => {
    for (const candidate of _HRULE) {
      if (nextBlock.startsWith(candidate)) {
        return candidate;
      }
    }
    return null;
  },
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

const LIST: KiwimeriTextBlockParser<O> = {
  name: 'list',
  tokenize: nextBlock => tokenizeHtmlTag(nextBlock, ['ul', 'ol', 'checked']),
  parse: text => {
    const node = baseElementNode('list') as SerializedListNode;
    const paragraphAlign = getTextAlign(text);
    let startTag = getStartTag(text, 'ul');
    let closingTag = '</ul>';
    if (startTag) {
      node.tag = 'ul';
      node.listType = 'bullet';
    } else {
      startTag = getStartTag(text, 'ol');
      if (startTag) {
        node.tag = 'ol';
        node.listType = 'number';
        closingTag = '</ol>';
      } else {
        startTag = getStartTag(text, 'checked');
        if (startTag) {
          node.tag = 'ul';
          node.listType = 'check';
          closingTag = '</checked>';
        }
      }
    }
    node.start = 1;
    node.format = paragraphAlign;
    return {
      node,
      text,
      blockData: { startTag, closingTag }
    };
  },
  preTokenizeChild(block) {
    const { startTag, closingTag } = block.blockData as BlockData;
    block.text = block.text.replace(startTag, '').replace(closingTag, '');
  }
};

export const PARAGRAPH: KiwimeriTextBlockParser<O> = {
  name: 'paragraph',
  tokenize: nextBlock => tokenizeHtmlTag(nextBlock, 'p'),
  parse: text => {
    const paragraphAlign = getTextAlign(text);
    const startTag = getStartTag(text, 'p')!;
    const node = baseElementNode('paragraph') as SerializedParagraphNode;
    node.textFormat = 0;
    node.textStyle = '';
    node.format = paragraphAlign;
    return {
      node,
      text,
      blockData: { startTag, closingTag: '</p>' }
    };
  },
  preTokenizeChild(block) {
    const { startTag, closingTag } = block.blockData as BlockData;
    block.text = block.text.replace(startTag, '').replace(closingTag, '');
  }
};

export const SIMPLE_HTML_BLOCKS: KiwimeriTextBlockParser<O>[] = [
  HEADING,
  QUOTE,
  HRULE,
  LIST,
  PARAGRAPH
];
