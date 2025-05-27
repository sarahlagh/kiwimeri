import { ListType } from '@lexical/list';
import {
  ElementFormatType,
  SerializedElementNode,
  SerializedTextNode,
  TEXT_TYPE_TO_FORMAT,
  TextFormatType
} from 'lexical';
import {
  KiwimeriFormatter,
  KiwimeriTransformer,
  KiwimeriTransformerCtx
} from '../formatter';

const getTextFormatNumber = (formatType: TextFormatType) => {
  return TEXT_TYPE_TO_FORMAT[formatType];
};

export const MARKDOWN_PARAGRAPH_TRANSFORMER: KiwimeriTransformer = {
  type: 'paragraph',
  preTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    const format = ctx.node.format as ElementFormatType;
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
    const format = ctx.node.format as ElementFormatType;
    switch (format) {
      case '':
        return fullstr + `${ctx.node.children.length > 0 ? '\n\n' : '\n'}`;
      default:
        return (
          fullstr + '</p>' + `${ctx.node.children.length > 0 ? '\n\n' : '\n'}`
        );
    }
  }
};

export const MARKDOWN_BOLD_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: node =>
    (node as SerializedTextNode).format === getTextFormatNumber('bold'),
  transform: function (text: string): string {
    return `**${text}**`;
  }
};

export const MARKDOWN_ITALIC_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: node =>
    (node as SerializedTextNode).format === getTextFormatNumber('italic'),
  transform: function (text: string): string {
    return `*${text}*`;
  }
};

export const MARKDOWN_UNDERLINE_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: node =>
    (node as SerializedTextNode).format === getTextFormatNumber('underline'),
  transform: function (text: string): string {
    return `<u>${text}</u>`;
  }
};

export const MARKDOWN_STRIKETHROUGH_TRANSFORMER: KiwimeriTransformer = {
  type: 'text',
  handles: node =>
    (node as SerializedTextNode).format ===
    getTextFormatNumber('strikethrough'),
  transform: function (text: string): string {
    return `~~${text}~~`;
  }
};

export const MARKDOWN_HEADING_TRANSFORMER: KiwimeriTransformer = {
  type: 'heading',
  preTransform: function (fullstr: string, ctx: KiwimeriTransformerCtx) {
    if ('tag' in ctx.node) {
      switch (ctx.node.tag) {
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
  preTransform: function (fullstr: string): string {
    return fullstr + '> ';
  },
  postTransform: function (
    fullstr: string,
    ctx: KiwimeriTransformerCtx
  ): string {
    // check if it's the last children
    if (ctx.parent && 'children' in ctx.parent) {
      const parent = ctx.parent as SerializedElementNode;
      const idx = parent.children.findIndex(child => child === ctx.node);
      if (
        idx < parent.children.length - 1 &&
        parent.children[idx + 1].type === 'quote'
      ) {
        return fullstr + '\n';
      }
    }
    return fullstr + '\n\n';
  }
};

export const MARKDOWN_LIST_TRANSFORMERS: KiwimeriTransformer[] = [
  {
    type: 'listitem',
    preTransform(fullstr, ctx: KiwimeriTransformerCtx) {
      let value = 1;
      if ('value' in ctx.node) {
        value = ctx.node.value as number;
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
    this.transformers = [...MARKDOWN_TRANSFORMERS, ...transformers];
  }
}

export const MARKDOWN_FORMATTER = new MarkdownFormatter([]);
