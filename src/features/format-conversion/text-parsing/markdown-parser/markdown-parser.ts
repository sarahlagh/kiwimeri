import { KiwimeriParserContext } from '../parser-context';
import { KiwimeriTextLexer } from '../text-lexer';
import { KiwimeriTextParser } from '../text-parser';
import { MarkdownLexer } from './markdown-lexer';

export class MarkdownParser extends KiwimeriTextParser {
  protected getLexer(text: string, opts?: unknown): KiwimeriTextLexer {
    return new MarkdownLexer(text, opts);
  }

  parseText(text: string, opts?: unknown) {
    const ctx = new KiwimeriParserContext();
    const lexer = this.getLexer(text, opts);

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
