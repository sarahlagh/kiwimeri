import { SerializedEditorState } from 'lexical/LexicalEditorState';
import { KiwimeriFormatter } from './formatter';
import { MARKDOWN_FORMATTER } from './formatters/markdown-formatter';
import {
  PLAIN_TEXT_FORMATTER,
  PlainTextFormatterOpts
} from './formatters/plain-text-formatter';
import { KiwimeriParser } from './parser';
import { MARKDOWN_PARSER } from './parsers/markdown-parser';

class FormatterService {
  public getFromLexical(
    lex: string,
    formatter: KiwimeriFormatter,
    opts?: unknown
  ) {
    try {
      const obj: SerializedEditorState = JSON.parse(lex);
      return formatter.parseLexNode(null, 0, 0, obj.root, opts);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // TODO handle error actually
      return e.message;
    }
  }

  public getPlainTextFromLexical(lex: string, opts?: PlainTextFormatterOpts) {
    return this.getFromLexical(lex, PLAIN_TEXT_FORMATTER, opts);
  }

  public getMarkdownFromLexical(lex: string) {
    return this.getFromLexical(lex, MARKDOWN_FORMATTER);
  }

  public getLexicalFromOther(
    text: string,
    parser: KiwimeriParser,
    opts?: unknown
  ) {
    return parser.parse(text, opts);
  }

  public getLexicalFromMarkdown(markdown: string) {
    return this.getLexicalFromOther(markdown, MARKDOWN_PARSER);
  }

  public getPagesSeparator() {
    // TODO depends on the format
    return '==============================================================\n';
  }
}

const formatterService = new FormatterService();
export default formatterService;
