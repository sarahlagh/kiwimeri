import {
  KiwimeriFormatter,
  KiwimeriTransformer,
  KiwimeriTransformerCtx
} from '../formatter';

export type PlainTextFormatterOpts = {
  inline?: boolean;
};

const getOpts = (opts?: unknown): PlainTextFormatterOpts =>
  opts ? (opts as PlainTextFormatterOpts) : {};

export const PLAIN_TEXT_ROOT_TRANSFORMER: KiwimeriTransformer = {
  type: 'root',
  postTransform: function (fullstr: string): string {
    return fullstr.trimEnd();
  }
};

export const PLAIN_TEXT_PARAGRAPH_TRANSFORMER: KiwimeriTransformer = {
  type: 'paragraph',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx,
    opts?: unknown
  ): string {
    if (ctx.node.children.length > 0) {
      return fullstr + (!getOpts(opts).inline ? '\n\n' : ' ');
    }
    return fullstr + (!getOpts(opts).inline ? '\n' : '');
  }
};

export const PLAIN_TEXT_HEADING_TRANSFORMER: KiwimeriTransformer = {
  type: 'heading',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx,
    opts?: unknown
  ) {
    return fullstr + (!getOpts(opts).inline ? '\n\n' : ' ');
  }
};

export const PLAIN_TEXT_LINEBREAK_TRANSFORMER: KiwimeriTransformer = {
  type: 'linebreak',
  transform: function (text: string, opts): string {
    return !getOpts(opts).inline ? '\n' : ' ';
  }
};

export const PLAIN_TEXT_QUOTE_TRANSFORMER: KiwimeriTransformer = {
  type: 'quote',
  transform: function (text: string, opts): string {
    return !getOpts(opts).inline ? '\n' : ' ';
  }
};

export const PLAIN_TEXT_LIST_TRANSFORMER: KiwimeriTransformer = {
  type: 'listitem',
  transform: function (text: string, opts): string {
    return !getOpts(opts).inline ? '\n' : ' ';
  }
};

export const PLAIN_TEXT_TRANSFORMERS: KiwimeriTransformer[] = [
  PLAIN_TEXT_ROOT_TRANSFORMER,
  PLAIN_TEXT_PARAGRAPH_TRANSFORMER,
  PLAIN_TEXT_HEADING_TRANSFORMER,
  PLAIN_TEXT_LINEBREAK_TRANSFORMER,
  PLAIN_TEXT_QUOTE_TRANSFORMER,
  PLAIN_TEXT_LIST_TRANSFORMER
];

export class PlainTextFormatter extends KiwimeriFormatter {
  constructor(protected transformers: KiwimeriTransformer[]) {
    super([]);
    this.transformers = [...PLAIN_TEXT_TRANSFORMERS, ...transformers];
  }
}

export const PLAIN_TEXT_FORMATTER = new PlainTextFormatter([]);
