import type { SerializedElementNode } from 'lexical';
import {
  KiwimeriLexConverter,
  KiwimeriLexTransformer,
  KiwimeriLexTransformerCtx
} from '../lex-converter';

export type PlainTextFormatterOpts = {
  inline?: boolean;
};

type O = PlainTextFormatterOpts;

const defaultOpts: Required<O> = {
  inline: false
};

const getOpts = (opts?: O): Required<O> =>
  opts ? { ...defaultOpts, ...opts } : defaultOpts;

const linebreak = (opts?: PlainTextFormatterOpts) =>
  !getOpts(opts).inline ? '\n' : ' ';
const doubleLinebreak = (opts?: PlainTextFormatterOpts) =>
  !getOpts(opts).inline ? '\n\n' : ' ';

export const PLAIN_TEXT_ROOT_TRANSFORMER: KiwimeriLexTransformer<O> = {
  type: 'root',
  postTransform: function (fullstr: string): string {
    return fullstr.trimEnd();
  }
};

export const PLAIN_TEXT_PARAGRAPH_TRANSFORMER: KiwimeriLexTransformer<O> = {
  type: 'paragraph',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: PlainTextFormatterOpts
  ): string {
    if (ctx.elementNode!.children.length > 0) {
      return fullstr + doubleLinebreak(opts);
    }
    return fullstr + (!getOpts(opts).inline ? '\n' : '');
  }
};

export const PLAIN_TEXT_HEADING_TRANSFORMER: KiwimeriLexTransformer<O> = {
  type: 'heading',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx,
    opts?: PlainTextFormatterOpts
  ) {
    return fullstr + doubleLinebreak(opts);
  }
};

export const PLAIN_TEXT_LINEBREAK_TRANSFORMER: KiwimeriLexTransformer<O> = {
  type: 'linebreak',
  transform: function (text: string, ctx, opts): string {
    return linebreak(opts);
  }
};

export const PLAIN_TEXT_QUOTE_TRANSFORMER: KiwimeriLexTransformer<O> = {
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

export const PLAIN_TEXT_LIST_TRANSFORMER: KiwimeriLexTransformer<O> = {
  type: 'listitem',
  transform: function (text: string, ctx, opts): string {
    return linebreak(opts);
  }
};

export const PLAIN_TEXT_TRANSFORMERS: KiwimeriLexTransformer<O>[] = [
  PLAIN_TEXT_ROOT_TRANSFORMER,
  PLAIN_TEXT_PARAGRAPH_TRANSFORMER,
  PLAIN_TEXT_HEADING_TRANSFORMER,
  PLAIN_TEXT_LINEBREAK_TRANSFORMER,
  PLAIN_TEXT_QUOTE_TRANSFORMER,
  PLAIN_TEXT_LIST_TRANSFORMER
];

export const PLAIN_TEXT_FORMATTER = new KiwimeriLexConverter<O>([
  ...PLAIN_TEXT_TRANSFORMERS
]);
