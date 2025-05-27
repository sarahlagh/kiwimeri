import { SerializedElementNode, SerializedLexicalNode } from 'lexical';

export type KiwimeriTransformerCtx = {
  node: SerializedElementNode;
  parent: SerializedLexicalNode | null;
};

export type KiwimeriTransformer = {
  type: string;
  handles?: (node: SerializedLexicalNode) => boolean;
  transform?: (text: string, opts?: unknown) => string;
  preTransform?: (
    fullstr: string,
    ctx: KiwimeriTransformerCtx,
    opts?: unknown
  ) => string;
  postTransform?: (
    fullstr: string,
    ctx: KiwimeriTransformerCtx,
    opts?: unknown
  ) => string;
};

export abstract class KiwimeriFormatter {
  constructor(protected transformers: KiwimeriTransformer[]) {}

  public stringifyLexNode(
    parent: SerializedLexicalNode | null,
    node: SerializedLexicalNode,
    opts?: unknown
  ) {
    let text = '';
    const transformer = this.transformers.find(
      ({ type, handles }) =>
        type === node.type && (handles ? handles(node) : true)
    );
    if ('children' in node) {
      const elementNode = node as SerializedElementNode;
      const ctx: KiwimeriTransformerCtx = {
        node: elementNode,
        parent
      };
      if (transformer?.preTransform) {
        text = transformer.preTransform(text, ctx, opts);
      }
      elementNode.children.forEach(child => {
        text += this.stringifyLexNode(elementNode, child, opts);
      });
      if (transformer?.postTransform) {
        text = transformer.postTransform(text, ctx, opts);
      }
    }
    if ('text' in node) {
      if (transformer?.transform) {
        text += transformer.transform(node.text as string, opts);
      } else {
        text += node.text;
      }
    } else if (transformer?.transform) {
      text += transformer.transform('', opts);
    }
    return text;
  }
}
