import { KiwimeriTextLexer } from '../text-lexer';
import { KiwimeriTextParser } from '../text-parser';
import { MarkdownLexer } from './markdown-lexer';

export class MarkdownParser extends KiwimeriTextParser {
  protected getLexer(text: string, opts?: unknown): KiwimeriTextLexer {
    return new MarkdownLexer(text, opts);
  }
}

export const MARKDOWN_PARSER = new MarkdownParser();
