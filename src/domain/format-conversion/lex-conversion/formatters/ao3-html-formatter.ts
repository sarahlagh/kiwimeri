import {
  ElementFormatType,
  IS_BOLD,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
  SerializedElementNode,
  SerializedTextNode
} from 'lexical';
import {
  KiwimeriLexConverter,
  KiwimeriLexTransformer,
  KiwimeriLexTransformerCtx
} from '../lex-converter';

const paragraphAlignOpeningTag = (ctx: KiwimeriLexTransformerCtx) => {
  const blockNode = ctx.elementNode ? ctx.elementNode : ctx.parent;
  if (blockNode) {
    const format = blockNode.format as ElementFormatType;
    if (format !== '' && format !== 'left' && format !== 'start') {
      return `<p align="${format}">`;
    }
  }
  return '<p>';
};

const paragraphAlignClosingTag = () => {
  return '</p>';
};

export const AO3_HTML_PARAGRAPH_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'paragraph',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
  ): string {
    return fullstr + paragraphAlignOpeningTag(ctx);
  },
  postTransform: function (fullstr: string): string {
    const tag = paragraphAlignClosingTag();
    return fullstr + tag + '\n';
  }
};

const genericTextFormatTransform = function (
  text: string,
  ctx: KiwimeriLexTransformerCtx,
  format: number,
  mdPrefix: string,
  mdSuffix: string
): string {
  let wasAppliedBefore = false;
  let stillAppliedAfter = false;
  let prefix = mdPrefix;
  let suffix = mdSuffix;
  if (ctx.parent && 'children' in ctx.parent) {
    const parentNode = ctx.parent as SerializedElementNode;
    const idx = parentNode.children.findIndex(child => child === ctx.node);
    wasAppliedBefore =
      idx > 0 &&
      'format' in parentNode.children[idx - 1] &&
      ((parentNode.children[idx - 1] as SerializedTextNode).format & format) ===
        format;
    if (wasAppliedBefore) {
      prefix = '';
    }
    stillAppliedAfter =
      idx < parentNode.children.length - 1 &&
      'format' in parentNode.children[idx + 1] &&
      ((parentNode.children[idx + 1] as SerializedTextNode).format & format) ===
        format;
    if (stillAppliedAfter) {
      suffix = '';
    }
  }
  return `${prefix}${text}${suffix}`;
};

export const AO3_HTML_BOLD_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_BOLD) === IS_BOLD,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_BOLD, '<strong>', '</strong>')
};

export const AO3_HTML_ITALIC_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_ITALIC) === IS_ITALIC,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_ITALIC, '<em>', '</em>')
};

export const AO3_HTML_UNDERLINE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_UNDERLINE) === IS_UNDERLINE,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_UNDERLINE, '<u>', '</u>')
};

export const AO3_HTML_STRIKETHROUGH_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_STRIKETHROUGH) ===
    IS_STRIKETHROUGH,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(
      text,
      ctx,
      IS_STRIKETHROUGH,
      '<strike>',
      '</strike>~'
    )
};

export const AO3_HTML_HEADING_TEXT_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: (ctx: KiwimeriLexTransformerCtx) => ctx.parent?.type === 'heading',
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) => {
    if (ctx.indexInLine > 0) {
      return text;
    }
    let lvl = 1;
    if ('tag' in ctx.parent!) {
      lvl = Number((ctx.parent.tag as string).slice(1));
    }
    return `<h${lvl}>${text}</h${lvl}>`;
  }
};

export const AO3_HTML_HEADING_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'heading',
  postTransform: function (fullstr: string) {
    return fullstr + '\n';
  }
};

export const AO3_HTML_LINEBREAK_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'linebreak',
  transform: function (): string {
    return '<br />';
  }
};

export const AO3_HTML_HRULE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'horizontalrule',
  transform: function (): string {
    return '<hr />\n';
  }
};

export const AO3_HTML_QUOTE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'quote',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
  ): string {
    return fullstr + '<blockquote>' + paragraphAlignOpeningTag(ctx);
  },
  postTransform: function (fullstr: string): string {
    const close = paragraphAlignClosingTag();
    return fullstr + close + '</blockquote>\n';
  }
};

export const AO3_HTML_TRANSFORMERS: KiwimeriLexTransformer[] = [
  AO3_HTML_PARAGRAPH_TRANSFORMER,
  AO3_HTML_BOLD_TRANSFORMER,
  AO3_HTML_ITALIC_TRANSFORMER,
  AO3_HTML_UNDERLINE_TRANSFORMER,
  AO3_HTML_STRIKETHROUGH_TRANSFORMER,
  AO3_HTML_HEADING_TEXT_TRANSFORMER,
  AO3_HTML_HEADING_TRANSFORMER,
  AO3_HTML_LINEBREAK_TRANSFORMER,
  AO3_HTML_HRULE_TRANSFORMER,
  AO3_HTML_QUOTE_TRANSFORMER
];

export const AO3_HTML_FORMATTER = new KiwimeriLexConverter([
  ...AO3_HTML_TRANSFORMERS
]);
