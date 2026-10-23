import { KiwimeriTextLexer } from '../text-lexer';
import { KiwimeriTextParser } from '../text-parser';
import { SimpleHtmlLexer } from './simple-html-lexer';

export type SimpleHtmlParserOpts = unknown;

const defaultOpts: Required<SimpleHtmlParserOpts> = {};

export const getOpts = (
  opts?: SimpleHtmlParserOpts
): Required<SimpleHtmlParserOpts> =>
  opts ? { ...defaultOpts, ...opts } : defaultOpts;

export class SimpleHtmlParser extends KiwimeriTextParser<SimpleHtmlParserOpts> {
  protected getNewLexer(
    text: string,
    opts?: SimpleHtmlParserOpts
  ): KiwimeriTextLexer<SimpleHtmlParserOpts> {
    return new SimpleHtmlLexer(text.replaceAll(/\n+ */g, ''), opts);
  }
}

export const SIMPLE_HTML_PARSER = new SimpleHtmlParser();
