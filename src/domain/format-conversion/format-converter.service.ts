import { type SerializedEditorState } from 'lexical';
import {
  MARKDOWN_FORMATTER,
  MarkdownFormatterOpts
} from './lex-conversion/formatters/markdown-formatter';
import {
  PLAIN_TEXT_FORMATTER,
  PlainTextFormatterOpts
} from './lex-conversion/formatters/plain-text-formatter';
import { KiwimeriLexConverter } from './lex-conversion/lex-converter';
import {
  MARKDOWN_PARSER,
  MarkdownParserOpts
} from './text-parsing/markdown-parser/markdown-parser';
import {
  SIMPLE_HTML_PARSER,
  SimpleHtmlParserOpts
} from './text-parsing/simple-html-parser/simple-html-parser';
import { KiwimeriTextParser } from './text-parsing/text-parser';

class FormatConversionService {
  public to<O>(
    lex: string,
    formatter: KiwimeriLexConverter<O>,
    opts?: O
  ): string {
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

  public toMarkdown(lex: string, opts?: MarkdownFormatterOpts) {
    return this.to(lex, MARKDOWN_FORMATTER, opts);
  }

  public from<O>(text: string, parser: KiwimeriTextParser<O>, opts?: O) {
    return parser.parse(text, opts);
  }

  public fromMarkdown(markdown: string, opts?: MarkdownParserOpts) {
    return this.from(markdown, MARKDOWN_PARSER, opts);
  }

  public fromSimpleHtml(html: string, opts?: SimpleHtmlParserOpts) {
    return this.from(html, SIMPLE_HTML_PARSER, opts);
  }
}

const formatConverter = new FormatConversionService();
export default formatConverter;
