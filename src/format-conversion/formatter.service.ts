import { SerializedElementNode, SerializedLexicalNode } from 'lexical';
import { SerializedEditorState } from 'lexical/LexicalEditorState';
import { KiwimeriFormatter } from './formatter';
import { MARKDOWN_FORMATTER } from './formatters/markdown-formatter';
import {
  PLAIN_TEXT_FORMATTER,
  PlainTextFormatterOpts
} from './formatters/plain-text-formatter';

class FormatterService {
  private handleLexNode(
    node: SerializedLexicalNode,
    formatter: KiwimeriFormatter,
    opts?: unknown,
    index?: number
  ) {
    let text = node.type === 'root' ? formatter.transformStart() : '';
    if ('children' in node) {
      const elementNode = node as SerializedElementNode;
      let i = 0;
      elementNode.children.forEach(child => {
        text += this.handleLexNode(child, formatter, opts, i++);
      });
    }
    text += formatter.transform(node, opts, index);
    if (node.type === 'root') {
      return formatter.transformEnd(text);
    }
    return text;
  }

  public getFromLexical(
    lex: string,
    formatter: KiwimeriFormatter,
    opts?: unknown
  ) {
    const obj: SerializedEditorState = JSON.parse(lex);
    return this.handleLexNode(obj.root, formatter, opts);
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
