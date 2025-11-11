import { SerializedEditorState } from 'lexical/LexicalEditorState';
import { MARKDOWN_FORMATTER } from './lex-conversion/formatters/markdown-formatter';
import {
  PLAIN_TEXT_FORMATTER,
  PlainTextFormatterOpts
} from './lex-conversion/formatters/plain-text-formatter';
import { KiwimeriLexConverter } from './lex-conversion/lex-converter';
import { MARKDOWN_PARSER } from './text-parsing/markdown-parser/markdown-parser';
import { KiwimeriTextParser } from './text-parsing/text-parser';

class FormatConversionService {
  public to(lex: string, formatter: KiwimeriLexConverter, opts?: unknown) {
    try {
      const obj: SerializedEditorState = JSON.parse(lex);
      return formatter.parseLexNode(null, 0, 0, obj.root, opts);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // TODO handle error actually
      return e.message;
    }
  }

  public toPlainText(lex: string, opts?: PlainTextFormatterOpts) {
    return this.to(lex, PLAIN_TEXT_FORMATTER, opts);
  }

  public toMarkdown(lex: string) {
    return this.to(lex, MARKDOWN_FORMATTER);
  }

  public from(text: string, parser: KiwimeriTextParser, opts?: unknown) {
    return parser.parse(text, opts);
  }

  public fromMarkdown(markdown: string) {
    return this.from(markdown, MARKDOWN_PARSER);
  }

  public getPagesSeparator() {
    // TODO depends on the format
    return '==============================================================\n';
  }
}

const formatConverter = new FormatConversionService();
export default formatConverter;
