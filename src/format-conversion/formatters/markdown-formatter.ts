import { SerializedLexicalNode } from 'lexical';
import { KiwimeriFormatter } from '../formatter';

export class MarkdownFormatter extends KiwimeriFormatter {
  public transform(node: SerializedLexicalNode): string {
    if ('text' in node && node.type === 'text') {
      return node.text as string;
    }
    if (
      ['paragraph', 'linebreak', 'heading'].find(type => type === node.type)
    ) {
      return ' ';
    }
    return '';
  }

  public transformStart(): string {
    return '';
  }

  public transformEnd(text: string): string {
    return text.trimEnd();
  }
}

export const MARKDOWN_FORMATTER = new MarkdownFormatter();
