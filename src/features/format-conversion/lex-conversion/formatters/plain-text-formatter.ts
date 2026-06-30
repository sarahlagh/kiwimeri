import { SerializedElementNode } from 'lexical';
import {
  KiwimeriLexConverter,
  KiwimeriLexTransformer,
  KiwimeriLexTransformerCtx
} from '../lex-converter';

export type PlainTextFormatterOpts = {
  inline?: boolean;
};

const getOpts = (opts?: unknown): PlainTextFormatterOpts =>
  opts ? (opts as PlainTextFormatterOpts) : {};

const linebreak = (opts: unknown) => (!getOpts(opts).inline ? '\n' : ' ');
const doubleLinebreak = (opts: unknown) =>
  !getOpts(opts).inline ? '\n\n' : ' ';

export const PLAIN_TEXT_ROOT_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'root',
  postTransform: function (fullstr: string): string {
    return fullstr.trimEnd();
  }
};

export const PLAIN_TEXT_PARAGRAPH_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'paragraph',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: unknown
  ): string {
    if (ctx.elementNode!.children.length > 0) {
      return fullstr + doubleLinebreak(opts);
    }
    return fullstr + (!getOpts(opts).inline ? '\n' : '');
  }
};

export const PLAIN_TEXT_HEADING_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'heading',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: unknown
  ) {
    return fullstr + doubleLinebreak(opts);
  }
};

export const PLAIN_TEXT_LINEBREAK_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'linebreak',
  transform: function (text: string, ctx, opts): string {
    return linebreak(opts);
  }
};

export const PLAIN_TEXT_QUOTE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'quote',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts
  ) {
    // check if it's the last children
    if (ctx.parent && 'children' in ctx.parent) {
      const parent = ctx.parent as SerializedElementNode;
      const idx = parent.children.findIndex(child => child === ctx.elementNode);
      if (
        idx < parent.children.length - 1 &&
        parent.children[idx + 1].type === 'quote'
      ) {
        return fullstr + linebreak(opts);
      }
    }
    return fullstr + doubleLinebreak(opts);
  }
};

export const PLAIN_TEXT_LIST_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'listitem',
  transform: function (text: string, ctx, opts): string {
    return linebreak(opts);
  }
};

export const PLAIN_TEXT_TRANSFORMERS: KiwimeriLexTransformer[] = [
  PLAIN_TEXT_ROOT_TRANSFORMER,
  PLAIN_TEXT_PARAGRAPH_TRANSFORMER,
  PLAIN_TEXT_HEADING_TRANSFORMER,
  PLAIN_TEXT_LINEBREAK_TRANSFORMER,
  PLAIN_TEXT_QUOTE_TRANSFORMER,
  PLAIN_TEXT_LIST_TRANSFORMER
];

export const PLAIN_TEXT_FORMATTER = new KiwimeriLexConverter([
  ...PLAIN_TEXT_TRANSFORMERS
]);
