import { SerializedLexicalNode } from 'lexical';

export type KiwimeriTransformer = {
  type: string;
};

export abstract class KiwimeriFormatter {
  protected transformers: KiwimeriTransformer[] = [];

  public abstract transform(
    node: SerializedLexicalNode,
    opts?: unknown,
    index?: number
  ): string;

  public abstract transformStart(): string;
  public abstract transformEnd(text?: string): string;
}
