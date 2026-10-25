import { appLog } from '@/core/logs/logs.service';
import type {
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode
} from 'lexical';
import { KiwimeriParserContext } from '../parser-context';
import { KiwimeriTextParserBase } from '../text-parser';
import {
  KiwimeriParserError,
  KiwimeriParserResponse,
  KiwimeriParserTextBlock
} from '../types';
import { KNOWN_TOP_LEVEL_HTML_TAGS, PARAGRAPH } from './simple-html-blocks';
import { SIMPLE_HTML_ELEMENTS } from './simple-html-elements';

export type SimpleHtmlParserOpts = {
  /** adds rel: noreferrer to links instead of null (default: true) */
  relAsNoReferrer?: boolean;
};
const defaultOpts: Required<SimpleHtmlParserOpts> = {
  relAsNoReferrer: true
};
export const getOpts = (
  opts?: SimpleHtmlParserOpts
): Required<SimpleHtmlParserOpts> =>
  opts ? { ...defaultOpts, ...opts } : defaultOpts;

class SimpleHtmlParser implements KiwimeriTextParserBase<SimpleHtmlParserOpts> {
  public parse(
    text: string,
    opts?: SimpleHtmlParserOpts
  ): KiwimeriParserResponse {
    try {
      const result = new DOMParser().parseFromString(
        text.replaceAll(/\n+ */g, ''),
        'text/html'
      ).body.children;
      return this.parseHtml(result, opts);
    } catch (e) {
      return {
        obj: null,
        errors: [{ message: appLog.stringify(e) }]
      };
    }
  }

  private parseHtml(
    html: HTMLCollection,
    opts?: SimpleHtmlParserOpts
  ): KiwimeriParserResponse {
    const ctx = new KiwimeriParserContext<SimpleHtmlParserOpts>();
    ctx.opts = getOpts(opts);
    const root: SerializedRootNode = {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: []
    };
    for (const el of html) {
      ctx.resetBlock();
      const tagName = el.tagName;
      const parser = KNOWN_TOP_LEVEL_HTML_TAGS.has(tagName)
        ? KNOWN_TOP_LEVEL_HTML_TAGS.get(tagName)!
        : PARAGRAPH;
      const block = parser.parse(el);
      if (!block) continue;
      if (this.isBlockElementNode(block.node)) {
        const { errors } = this.handleBlock(block, el, ctx);
        if (errors && errors.length > 0) {
          return { obj: null, errors };
        }
      }
      root.children.push(block.node);
      ctx.addBlock(block);
    }
    return { obj: { root } };
  }

  protected handleBlock(
    block: KiwimeriParserTextBlock,
    el: Element | ChildNode,
    ctx: KiwimeriParserContext<SimpleHtmlParserOpts>
  ): {
    errors?: KiwimeriParserError[];
  } {
    ctx = ctx.copy(block);
    const parent = block.node as SerializedElementNode;
    for (const childNode of el.childNodes) {
      for (const elParser of SIMPLE_HTML_ELEMENTS) {
        if (!elParser.parse) continue;
        const child = elParser.parse(childNode, ctx);
        if (child) {
          parent.children.push(child);
          ctx.addElement(null, child);

          if (elParser.captures && elParser.captures() && child) {
            this.handleBlock({ ...block, node: child }, childNode, ctx);
          }
        }
        if (elParser.hasSiblings && elParser.hasSiblings(childNode)) {
          this.handleBlock(block, childNode, ctx);
          if (elParser.postParse) elParser.postParse(ctx);
        }
      }
    }
    return {};
  }

  protected isBlockElementNode(
    node?: SerializedLexicalNode | null
  ): node is SerializedElementNode {
    return (node && 'children' in node) || false;
  }
}

export const SIMPLE_HTML_PARSER = new SimpleHtmlParser();
