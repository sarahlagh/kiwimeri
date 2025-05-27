import { SerializedElementNode, SerializedLexicalNode } from 'lexical';

export type KiwimeriTransformer = {
  type: string;
  handles?: (node: SerializedLexicalNode) => boolean;
  transform?: (text: string, opts?: unknown) => string;
  preTransform?: (
    fullstr: string,
    hasChildren: boolean,
    opts?: unknown
  ) => string;
  postTransform?: (
    fullstr: string,
    hasChildren: boolean,
    opts?: unknown
  ) => string;
};

export abstract class KiwimeriFormatter {
  constructor(protected transformers: KiwimeriTransformer[]) {}

  public stringifyLexNode(node: SerializedLexicalNode, opts?: unknown) {
    let text = '';
    const transformer = this.transformers.find(
      ({ type, handles }) =>
        type === node.type && (handles ? handles(node) : true)
    );
    if ('children' in node) {
      const elementNode = node as SerializedElementNode;
      const hasChildren = elementNode.children.length > 0;

      if (transformer?.preTransform) {
        text = transformer.preTransform(text, hasChildren, opts);
      }
      elementNode.children.forEach(child => {
        text += this.stringifyLexNode(child, opts);
      });
      if (transformer?.postTransform) {
        text = transformer.postTransform(text, hasChildren, opts);
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
