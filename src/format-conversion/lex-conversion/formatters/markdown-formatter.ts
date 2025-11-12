import {
  ESCAPE_CHARS,
  EXTENDED_ESCAPE_CHARS
} from '@/format-conversion/text-parsing/markdown-parser/markdown-elements';
import { ListType } from '@lexical/list';
import {
  ElementFormatType,
  IS_BOLD,
  IS_HIGHLIGHT,
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
    if (format !== '') {
      return `<p style="text-align: ${format};">`;
    }
  }
  return '';
};

const paragraphAlignClosingTag = (ctx: KiwimeriLexTransformerCtx) => {
  const blockNode = ctx.elementNode ? ctx.elementNode : ctx.parent;
  if (blockNode) {
    const format = blockNode.format as ElementFormatType;
    if (format !== '') {
      return `</p>`;
    }
  }
  return '';
};

export const MARKDOWN_PARAGRAPH_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'paragraph',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
  ): string {
    return fullstr + paragraphAlignOpeningTag(ctx);
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
  ): string {
    const tag = paragraphAlignClosingTag(ctx);
    const close =
      ctx.elementNode!.children.length > 0 || tag !== '' ? '\n\n' : '\n';
    return fullstr + tag + close;
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

const ESCAPE_CHARS_REGEX = new RegExp(`([${ESCAPE_CHARS}])`, 'g');
const EXTENDED_ESCAPE_CHARS_REGEX = new RegExp(
  `^([${EXTENDED_ESCAPE_CHARS}])`,
  'gm'
);

// escape markdown chars with \
export const MARKDOWN_TEXT_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: () => true,
  transform: (text: string, ctx) => {
    text = text.replaceAll(ESCAPE_CHARS_REGEX, '\\$1');
    if (ctx.indexInLine === 0) {
      return text.replaceAll(EXTENDED_ESCAPE_CHARS_REGEX, '\\$1');
    }
    return text;
  }
};

export const MARKDOWN_BOLD_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_BOLD) === IS_BOLD,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_BOLD, '**', '**')
};

export const MARKDOWN_ITALIC_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_ITALIC) === IS_ITALIC,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_ITALIC, '*', '*')
};

export const MARKDOWN_UNDERLINE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_UNDERLINE) === IS_UNDERLINE,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_UNDERLINE, '<u>', '</u>')
};

export const MARKDOWN_STRIKETHROUGH_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_STRIKETHROUGH) ===
    IS_STRIKETHROUGH,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_STRIKETHROUGH, '~~', '~~')
};

export const MARKDOWN_HIGHLIGHT_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: ({ node }) =>
    ((node as SerializedTextNode).format & IS_HIGHLIGHT) === IS_HIGHLIGHT,
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) =>
    genericTextFormatTransform(text, ctx, IS_HIGHLIGHT, '==', '==')
};

export const MARKDOWN_HEADING_TEXT_TRANSFORMER: KiwimeriLexTransformer = {
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
    return (
      '#'.repeat(lvl) +
      ` ${paragraphAlignOpeningTag(ctx)}${text}${paragraphAlignClosingTag(ctx)}`
    );
  }
};

export const MARKDOWN_HEADING_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'heading',
  postTransform: function (fullstr: string) {
    return fullstr + '\n\n';
  }
};

export const MARKDOWN_LINEBREAK_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'linebreak',
  transform: function (): string {
    return '\n';
  }
};

export const MARKDOWN_HRULE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'horizontalrule',
  transform: function (): string {
    return '---\n\n';
  }
};

export const MARKDOWN_QUOTE_TEXT_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'text',
  handles: (ctx: KiwimeriLexTransformerCtx) => ctx.parent?.type === 'quote',
  transform: (text: string, ctx: KiwimeriLexTransformerCtx) => {
    if (ctx.indexInParent > 0 && ctx.indexInLine == 0) {
      return '  ' + text;
    }
    return text;
  }
};

export const MARKDOWN_QUOTE_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'quote',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
  ): string {
    return fullstr + '> ' + paragraphAlignOpeningTag(ctx);
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
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

export const MARKDOWN_LIST_TRANSFORMERS: KiwimeriLexTransformer[] = [
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
    preTransform(fullstr, ctx: KiwimeriLexTransformerCtx) {
      let value = 1;
      if ('value' in ctx.elementNode!) {
        value = ctx.elementNode.value as number;
      }
      const parent = ctx.parent;
      if (parent && parent.type === 'list' && 'listType' in parent) {
        const listType = parent.listType as ListType;
        let check = '';
        if (ctx.elementNode && 'checked' in ctx.elementNode) {
          check = ctx.elementNode.checked === true ? 'x' : ' ';
        }
        switch (listType) {
          case 'bullet':
            return fullstr + '- ' + paragraphAlignOpeningTag(ctx);
          case 'number':
            return `${fullstr}${value}. ${paragraphAlignOpeningTag(ctx)}`;
          case 'check':
            return `${fullstr}- [${check}] ${paragraphAlignOpeningTag(ctx)}`;
        }
      }
      return fullstr + '- ';
    },
    postTransform(fullstr, ctx) {
      return fullstr + paragraphAlignClosingTag(ctx) + '\n';
    }
  },
  {
    type: 'list',
    postTransform(fullstr) {
      return fullstr + '\n';
    }
  }
];

export const MARKDOWN_LINKS_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'link',
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriLexTransformerCtx
  ): string {
    const { title, url } = ctx.node as unknown as {
      title?: string | null;
      url: string;
    };
    if (title) return `[${fullstr}](${url} "${title}")`;
    return `[${fullstr}](${url})`;
  }
};

export const MARKDOWN_AUTOLINKS_TRANSFORMER: KiwimeriLexTransformer = {
  type: 'autolink',
  handles: ctx => 'isUnlinked' in ctx.node && ctx.node.isUnlinked === false,
  postTransform: function (fullstr: string): string {
    return `<${fullstr}>`;
  }
};

export const MARKDOWN_TRANSFORMERS: KiwimeriLexTransformer[] = [
  MARKDOWN_TEXT_TRANSFORMER,
  MARKDOWN_HEADING_TEXT_TRANSFORMER,
  MARKDOWN_QUOTE_TEXT_TRANSFORMER,
  MARKDOWN_PARAGRAPH_TRANSFORMER,
  MARKDOWN_BOLD_TRANSFORMER,
  MARKDOWN_ITALIC_TRANSFORMER,
  MARKDOWN_UNDERLINE_TRANSFORMER,
  MARKDOWN_STRIKETHROUGH_TRANSFORMER,
  MARKDOWN_HIGHLIGHT_TRANSFORMER,
  MARKDOWN_HEADING_TRANSFORMER,
  MARKDOWN_LINEBREAK_TRANSFORMER,
  MARKDOWN_HRULE_TRANSFORMER,
  MARKDOWN_QUOTE_TRANSFORMER,
  ...MARKDOWN_LIST_TRANSFORMERS,
  MARKDOWN_LINKS_TRANSFORMER,
  MARKDOWN_AUTOLINKS_TRANSFORMER
];

export const MARKDOWN_FORMATTER = new KiwimeriLexConverter([
  ...MARKDOWN_TRANSFORMERS
]);
