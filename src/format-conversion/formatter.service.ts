import { SerializedEditorState } from 'lexical/LexicalEditorState';
import { KiwimeriFormatter } from './formatter';
import { MARKDOWN_FORMATTER } from './formatters/markdown-formatter';
import {
  PLAIN_TEXT_FORMATTER,
  PlainTextFormatterOpts
} from './formatters/plain-text-formatter';

class FormatterService {
  public getFromLexical(
    lex: string,
    formatter: KiwimeriFormatter,
    opts?: unknown
  ) {
    try {
      const obj: SerializedEditorState = JSON.parse(lex);
      return formatter.stringifyLexNode(null, obj.root, opts);
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

  // TODO
  public getLexicalFromMarkdown(markdown: string) {
    return markdown;
  }
}

const formatterService = new FormatterService();
export default formatterService;
