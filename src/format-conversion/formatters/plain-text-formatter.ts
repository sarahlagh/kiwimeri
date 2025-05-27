import { SerializedElementNode, SerializedLexicalNode } from 'lexical';
import { KiwimeriFormatter } from '../formatter';

export type PlainTextFormatterOpts = {
  inline?: boolean;
};

export class PlainTextFormatter extends KiwimeriFormatter {
  private SIMPLE_RETURNS = ['linebreak', 'quote', 'listitem'];
  private DOUBLE_RETURNS = ['paragraph', 'heading'];

  public transform(
    node: SerializedLexicalNode,
    opts?: PlainTextFormatterOpts
  ): string {
    if ('text' in node && node.type === 'text') {
      return node.text as string;
    }
    if (node.type === 'paragraph') {
      if (
        'children' in node &&
        (node as SerializedElementNode).children.length > 0
      ) {
        return !opts?.inline ? '\n\n' : ' ';
      }
      return !opts?.inline ? '\n' : '';
    }
    if (this.SIMPLE_RETURNS.find(type => type === node.type)) {
      return !opts?.inline ? '\n' : ' ';
    }
    if (this.DOUBLE_RETURNS.find(type => type === node.type)) {
      return !opts?.inline ? '\n\n' : ' ';
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

export const PLAIN_TEXT_FORMATTER = new PlainTextFormatter();
