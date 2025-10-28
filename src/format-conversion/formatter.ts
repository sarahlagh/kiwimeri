import { SerializedElementNode, SerializedLexicalNode } from 'lexical';

export type KiwimeriTransformerCtx = {
  node: SerializedLexicalNode;
  elementNode?: SerializedElementNode;
  parent: SerializedLexicalNode | null;
};

export type KiwimeriTransformer = {
  type: string; // node type
  handles?: (ctx: KiwimeriTransformerCtx) => boolean;
  transform?: (
    text: string,
    ctx: KiwimeriTransformerCtx,
    opts?: unknown
  ) => string;
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

  public parseLexNode(
    parent: SerializedLexicalNode | null,
    node: SerializedLexicalNode,
    opts?: unknown
  ) {
    let text = '';
    const transformers = this.transformers.filter(
      ({ type, handles }) =>
        type === node.type && (handles ? handles({ node, parent }) : true)
    );
    const ctx: KiwimeriTransformerCtx = {
      node,
      parent
    };

    if ('children' in node) {
      const elementNode = node as SerializedElementNode;
      ctx.elementNode = elementNode;
      text = this.applyTransformersOnNode(
        transformers,
        'preTransform',
        ctx,
        text,
        opts
      );
      elementNode.children.forEach(child => {
        text += this.parseLexNode(elementNode, child, opts);
      });
      text = this.applyTransformersOnNode(
        transformers,
        'postTransform',
        ctx,
        text,
        opts
      );
    }
    if ('text' in node) {
      text += this.applyTransformers(
        transformers,
        ctx,
        node.text as string,
        opts
      );
    } else {
      text += this.applyTransformers(transformers, ctx, '', opts);
    }
    return text;
  }

  private applyTransformers(
    transformers: KiwimeriTransformer[],
    ctx: KiwimeriTransformerCtx,
    text: string,
    opts?: unknown
  ) {
    let newText = text;
    transformers.forEach(transformer => {
      if (transformer.transform) {
        newText = transformer.transform(newText, ctx, opts);
      }
    });
    return newText;
  }

  private applyTransformersOnNode(
    transformers: KiwimeriTransformer[],
    method: 'preTransform' | 'postTransform',
    ctx: KiwimeriTransformerCtx,
    text: string,
    opts?: unknown
  ) {
    let newText = text;
    transformers.forEach(transformer => {
      if (method in transformer && transformer[method]) {
        newText = transformer[method](newText, ctx, opts);
      }
    });
    return newText;
  }
}
