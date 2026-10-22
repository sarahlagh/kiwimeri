import { KiwimeriParserContext } from '../parser-context';
import { KiwimeriTextLexer } from '../text-lexer';
import { KiwimeriTextParser } from '../text-parser';
import { MarkdownLexer } from './markdown-lexer';

export type MarkdownParserOpts = {
  /** adds rel: noreferrer to links instead of null (default: true) */
  relAsNoReferrer?: boolean;
  /** if true, urls will be treated as text (default: false) */
  noAutoLinks?: boolean;
};

const defaultOpts: Required<MarkdownParserOpts> = {
  relAsNoReferrer: true,
  noAutoLinks: false
};

export const getOpts = (
  opts?: MarkdownParserOpts
): Required<MarkdownParserOpts> =>
  opts ? { ...defaultOpts, ...opts } : defaultOpts;

export class MarkdownParser extends KiwimeriTextParser<MarkdownParserOpts> {
  protected getNewLexer(
    text: string,
    opts?: MarkdownParserOpts
  ): KiwimeriTextLexer<MarkdownParserOpts> {
    return new MarkdownLexer(text, opts);
  }

  parseText(text: string, opts?: MarkdownParserOpts) {
    const ctx = new KiwimeriParserContext();
    const lexer = this.getNewLexer(text, opts);

    if (!lexer.nextBlock()) return null;
    const { token, blockParser } = lexer.consumeBlock()!;
    if (!blockParser) return null;
    const block = blockParser.parse(token);
    if (!block) return null;
    if (!this.isBlockElementNode(block.node)) return null;

    const { errors } = this.handleBlock(lexer, block, ctx);
    if (!errors) return block.node.children;
    return null;
  }
}

export const MARKDOWN_PARSER = new MarkdownParser();
