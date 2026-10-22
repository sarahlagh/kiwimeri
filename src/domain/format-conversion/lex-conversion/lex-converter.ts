import type { SerializedElementNode, SerializedLexicalNode } from 'lexical';

export type KiwimeriLexTransformerCtx = {
  node: SerializedLexicalNode;
  elementNode?: SerializedElementNode;
  parent: SerializedElementNode | null;
  indexInParent: number;
  indexInLine: number;
};

export type KiwimeriLexTransformer<O> = {
  type: string; // node type
  handles?: (ctx: KiwimeriLexTransformerCtx) => boolean;
  transform?: (
    text: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: O
  ) => string;
  preTransform?: (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: O
  ) => string;
  postTransform?: (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: O
  ) => string;
};

export class KiwimeriLexConverter<O> {
  constructor(protected transformers: KiwimeriLexTransformer<O>[]) {}

  public parseSimpleLexNode(node: SerializedLexicalNode, opts?: O) {
    return this.parseLexNode(null, 0, 0, node, opts);
  }

  public parseLexNode(
    parent: SerializedElementNode | null,
    indexInParent: number,
    indexInLine: number,
    node: SerializedLexicalNode,
    opts?: O
  ) {
    const ctx: KiwimeriLexTransformerCtx = {
      node,
      parent,
      indexInParent,
      indexInLine
    };
    let text = '';
    const transformers = this.transformers.filter(
      ({ type, handles }) =>
        type === node.type && (handles ? handles(ctx) : true)
    );

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
      let indexInLine = 0;
      elementNode.children.forEach((child, idx) => {
        if (child.type === 'linebreak') {
          indexInLine = -1;
        }
        text += this.parseLexNode(elementNode, idx, indexInLine++, child, opts);
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
    transformers: KiwimeriLexTransformer<O>[],
    ctx: KiwimeriLexTransformerCtx,
    text: string,
    opts?: O
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
    transformers: KiwimeriLexTransformer<O>[],
    method: 'preTransform' | 'postTransform',
    ctx: KiwimeriLexTransformerCtx,
    text: string,
    opts?: O
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
