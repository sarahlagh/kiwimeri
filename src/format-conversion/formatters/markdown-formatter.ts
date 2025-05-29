import { ListType } from '@lexical/list';
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
  KiwimeriFormatter,
  KiwimeriTransformer,
  KiwimeriTransformerCtx
} from '../formatter';

export const MARKDOWN_PARAGRAPH_TRANSFORMER: KiwimeriTransformer = {
  type: 'paragraph',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const format = ctx.elementNode!.format as ElementFormatType;
    switch (format) {
      case '':
        return fullstr;
      default:
        return fullstr + `<p style="text-align: ${format};">`;
    }
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const format = ctx.elementNode!.format as ElementFormatType;
    switch (format) {
      case '':
        return (
          fullstr + `${ctx.elementNode!.children.length > 0 ? '\n\n' : '\n'}`
        );
      default:
        return (
          fullstr +
          '</p>' +
          `${ctx.elementNode!.children.length > 0 ? '\n\n' : '\n'}`
        );
    }
  }
};

const genericTextFormatTransform = function (
  text: string,
  ctx: KiwimeriTransformerCtx,
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

export const MARKDOWN_BOLD_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_BOLD) === IS_BOLD,
  transform: (text: string, ctx: KiwimeriTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_BOLD, '**', '**')
};

export const MARKDOWN_ITALIC_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_ITALIC) === IS_ITALIC,
  transform: (text: string, ctx: KiwimeriTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_ITALIC, '*', '*')
};

export const MARKDOWN_UNDERLINE_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_UNDERLINE) === IS_UNDERLINE,
  transform: (text: string, ctx: KiwimeriTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_UNDERLINE, '<u>', '</u>')
};

export const MARKDOWN_STRIKETHROUGH_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_STRIKETHROUGH) ===
    IS_STRIKETHROUGH,
  transform: (text: string, ctx: KiwimeriTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_STRIKETHROUGH, '~~', '~~')
};

export const MARKDOWN_HEADING_TRANSFORMER: KiwimeriTransformer = {
  type: 'heading',
  preTransform: function (fullstr: string, ctx: KiwimeriTransformerCtx) {
    if ('tag' in ctx.elementNode!) {
      switch (ctx.elementNode.tag) {
        case 'h1':
        default:
          return fullstr + '# ';
        case 'h2':
          return fullstr + '## ';
        case 'h3':
          return fullstr + '### ';
      }
    }
    return fullstr + '# ';
  },
  postTransform: function (fullstr: string) {
    return fullstr + '\n\n';
  }
};

export const MARKDOWN_LINEBREAK_TRANSFORMER: KiwimeriTransformer = {
  type: 'linebreak',
  transform: function (): string {
    return '\n';
  }
};

export const MARKDOWN_HRULE_TRANSFORMER: KiwimeriTransformer = {
  type: 'horizontalrule',
  transform: function (): string {
    return '---\n\n';
  }
};

export const MARKDOWN_QUOTE_TRANSFORMER: KiwimeriTransformer = {
  type: 'quote',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const format = ctx.elementNode!.format as ElementFormatType;
    switch (format) {
      case '':
        return fullstr + '> ';
      default:
        return fullstr + `> <p style="text-align: ${format};">`;
    }
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const format = ctx.elementNode!.format as ElementFormatType;
    let close = '';
    switch (format) {
      case '':
        break;
      default:
        close = '</p>';
    }
    // check if it's the last children
    if (ctx.parent && 'children' in ctx.parent) {
      const parent = ctx.parent as SerializedElementNode;
      const idx = parent.children.findIndex(child => child === ctx.elementNode);
      if (
        idx < parent.children.length - 1 &&
        parent.children[idx + 1].type === 'quote'
      ) {
        return fullstr + close + '\n';
      }
    }
    return fullstr + close + '\n\n';
  }
};

export const MARKDOWN_LIST_TRANSFORMERS: KiwimeriTransformer[] = [
  {
    type: 'listitem',
    preTransform(fullstr, ctx: KiwimeriTransformerCtx) {
      let value = 1;
      if ('value' in ctx.elementNode!) {
        value = ctx.elementNode.value as number;
      }
      const parent = ctx.parent;
      if (parent && parent.type === 'list' && 'listType' in parent) {
        const listType = parent.listType as ListType;
        switch (listType) {
          case 'bullet':
          default:
            return fullstr + '- ';
          case 'number':
            return fullstr + `${value}. `;
        }
      }
      return fullstr + '- ';
    },
    postTransform(fullstr) {
      return fullstr + '\n';
    }
  },
  {
    type: 'list',
    postTransform(fullstr) {
      return fullstr + '\n';
    }
  }
];

export const MARKDOWN_TRANSFORMERS: KiwimeriTransformer[] = [
  MARKDOWN_PARAGRAPH_TRANSFORMER,
  // MARKDOWN_TEXT_FORMAT_TRANSFORMER,
  MARKDOWN_BOLD_TRANSFORMER,
  MARKDOWN_ITALIC_TRANSFORMER,
  MARKDOWN_UNDERLINE_TRANSFORMER,
  MARKDOWN_STRIKETHROUGH_TRANSFORMER,
  MARKDOWN_HEADING_TRANSFORMER,
  MARKDOWN_LINEBREAK_TRANSFORMER,
  MARKDOWN_HRULE_TRANSFORMER,
  MARKDOWN_QUOTE_TRANSFORMER,
  ...MARKDOWN_LIST_TRANSFORMERS
];

export class MarkdownFormatter extends KiwimeriFormatter {
  constructor(protected transformers: KiwimeriTransformer[]) {
    super([]);
    this.transformers = [...transformers, ...MARKDOWN_TRANSFORMERS];
  }
}

export const MARKDOWN_FORMATTER = new MarkdownFormatter([]);
