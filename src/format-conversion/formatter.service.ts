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
      return formatter.parseLexNode(null, obj.root, opts);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return lex;
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
  ): SerializedEditorState {
    return parser.parse(text, opts).obj!; // TODO handle errors
  }

  public getLexicalFromMarkdown(markdown: string) {
    return this.getLexicalFromOther(markdown, MARKDOWN_PARSER);
  }
}

const formatterService = new FormatterService();
export default formatterService;
