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

const paragraphAlignOpeningTag = (ctx: KiwimeriTransformerCtx) => {
  const format = ctx.elementNode!.format as ElementFormatType;
  if (format !== '') {
    return `<p style="text-align: ${format};">`;
  }
  return '';
};

const paragraphAlignClosingTag = (ctx: KiwimeriTransformerCtx) => {
  const format = ctx.elementNode!.format as ElementFormatType;
  if (format !== '') {
    return `</p>`;
  }
  return '';
};

export const MARKDOWN_PARAGRAPH_TRANSFORMER: KiwimeriTransformer = {
  type: 'paragraph',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    return fullstr + paragraphAlignOpeningTag(ctx);
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    return (
      fullstr +
      paragraphAlignClosingTag(ctx) +
      `${ctx.elementNode!.children.length > 0 ? '\n\n' : '\n'}`
    );
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

// escape markdown chars with \
export const MARKDOWN_TEXT_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: () => true,
  transform: (text: string) =>
    text.replaceAll(/([*_~<])/g, '\\$1').replaceAll(/^#/gm, '\\#')
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
    let lvl = 1;
    if ('tag' in ctx.elementNode!) {
      lvl = Number((ctx.elementNode.tag as string).slice(1));
    }
    let paragraphAlign = paragraphAlignOpeningTag(ctx);
    if (paragraphAlign !== '') {
      paragraphAlign = `${paragraphAlign}\n`;
    }
    return fullstr + paragraphAlign + '#'.repeat(lvl) + ' ';
  },
  postTransform: function (fullstr: string, ctx: KiwimeriTransformerCtx) {
    return fullstr + `\n${paragraphAlignClosingTag(ctx)}\n`;
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
    return fullstr + '> ' + paragraphAlignOpeningTag(ctx);
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const close = paragraphAlignClosingTag(ctx);
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
    type: 'linebreak',
    handles: ({ parent }) => {
      return parent !== null && parent.type === 'listitem';
    },
    transform: function (): string {
      return '\n  ';
    }
  },
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

export const MARKDOWN_LINKS_TRANSFORMER: KiwimeriTransformer = {
  type: 'link',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const { title, url } = ctx.node as unknown as {
      title?: string | null;
      url: string;
    };
    if (title) return `[${fullstr}](${url} "${title}")`;
    return `[${fullstr}](${url})`;
  }
};

export const MARKDOWN_AUTOLINKS_TRANSFORMER: KiwimeriTransformer = {
  type: 'autolink',
  handles: ctx => 'isUnlinked' in ctx.node && ctx.node.isUnlinked === false,
  postTransform: function (fullstr: string): string {
    return `<${fullstr}>`;
  }
};

export const MARKDOWN_TRANSFORMERS: KiwimeriTransformer[] = [
  MARKDOWN_TEXT_TRANSFORMER,
  MARKDOWN_PARAGRAPH_TRANSFORMER,
  MARKDOWN_BOLD_TRANSFORMER,
  MARKDOWN_ITALIC_TRANSFORMER,
  MARKDOWN_UNDERLINE_TRANSFORMER,
  MARKDOWN_STRIKETHROUGH_TRANSFORMER,
  MARKDOWN_HEADING_TRANSFORMER,
  MARKDOWN_LINEBREAK_TRANSFORMER,
  MARKDOWN_HRULE_TRANSFORMER,
  MARKDOWN_QUOTE_TRANSFORMER,
  ...MARKDOWN_LIST_TRANSFORMERS,
  MARKDOWN_LINKS_TRANSFORMER,
  MARKDOWN_AUTOLINKS_TRANSFORMER
];

export class MarkdownFormatter extends KiwimeriFormatter {
  constructor(protected transformers: KiwimeriTransformer[]) {
    super([]);
    this.transformers = [...transformers, ...MARKDOWN_TRANSFORMERS];
  }
}

export const MARKDOWN_FORMATTER = new MarkdownFormatter([]);
