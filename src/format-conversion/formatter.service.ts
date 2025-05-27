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
    const obj: SerializedEditorState = JSON.parse(lex);
    return formatter.stringifyLexNode(null, obj.root, opts);
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

  public getPlainPreview(html: string, maxLength = 80) {
    return html
      .replaceAll('</p>', '\n')
      .replaceAll('<br>', '\n')
      .replaceAll(/<[^>]*>/g, '')
      .substring(0, maxLength);
  }
}

const formatterService = new FormatterService();
export default formatterService;
