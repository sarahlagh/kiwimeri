import { IS_BOLD, IS_ITALIC, IS_STRIKETHROUGH, IS_UNDERLINE } from 'lexical';
import { KiwimeriLexer } from '../lexer';
import {
  KiwimeriParser,
  KiwimeriParserBlock,
  KiwimeriParserContext,
  KiwimeriParserText
} from '../parser';
import { MarkdownLexer } from './markdown-lexer';

export class MarkdownParser extends KiwimeriParser {
  protected keywordMap: { [k: string]: number } = {
    '**': IS_BOLD,
    __: IS_BOLD,
    '*': IS_ITALIC,
    _: IS_ITALIC,
    '~~': IS_STRIKETHROUGH
  };

  protected getLexer(text: string, opts?: unknown): KiwimeriLexer {
    return new MarkdownLexer(text, opts);
  }

  protected parseBlock(token: string): KiwimeriParserBlock {
    // heading
    const heading = token.match(/^(#+)/g);
    if (heading) {
      return {
        token,
        text: token.replace(heading[0], '').trimStart(),
        type: 'heading'
      };
    }

    // quote
    if (token.startsWith('>')) {
      return {
        token,
        text: token.replace('>', '').trimStart(),
        type: 'quote'
      };
    }

    // horizontalrule
    if (token.startsWith('---')) {
      return {
        token,
        text: '',
        type: 'horizontalrule'
      };
    }

    // list
    if (token.startsWith('- ') || token.match(/^\d+\. /g)) {
      return {
        token,
        text: token,
        type: 'list'
      };
    }

    // empty paragraphs
    if (token.match(/^\n+/g)) {
      return {
        token: '\n',
        text: '',
        type: 'paragraph'
      };
    }
    if (token.match(/^<p [^>]*><\/p>\n+/g)) {
      return {
        token,
        text: token,
        type: 'paragraph'
      };
    }

    // the default block: paragraph
    return {
      token,
      text: token,
      type: 'paragraph'
    };
  }

  protected parseText(
    token: string,
    type: 'text' | 'keyword',
    ctx: KiwimeriParserContext
  ): KiwimeriParserText | null {
    // if previous text was linebreak in a list, remove indent
    const indent = token.match(/^[ \t]+[^ \t\n]+/g);
    if (
      ctx.lastBlock?.type === 'list' &&
      ctx.lastText?.type === 'linebreak' &&
      indent
    ) {
      token = token.trimStart();
    }

    // handle list items
    if (ctx.lastBlock?.type === 'list' && type === 'keyword') {
      if (token.startsWith('-')) {
        return {
          token,
          type: 'listitem'
        };
      }
      const numberedList = token.match(/^\d+\./g);
      if (numberedList) {
        return {
          token,
          type: 'listitem'
        };
      }
    }

    // handle linebreaks
    if (token === '\n') {
      // if linebreak, but in a list not followed by indent, ignore token
      if (
        ctx.lastBlock?.type === 'list' &&
        (ctx.nextText?.token.startsWith('-') ||
          ctx.nextText?.token.match(/^\d+\./g))
      ) {
        return null;
      }
      return {
        type: 'linebreak',
        token: '\n'
      };
    }

    // handle format
    if (type === 'keyword') {
      for (const kw of Object.keys(this.keywordMap)) {
        if (token === kw) {
          if (ctx.keywords.filter(k => k.token === kw).length % 2) {
            // closing, must remove format
            ctx.removeFormat(this.keywordMap[kw]);
          } else {
            // adding, must add format
            ctx.addFormat(this.keywordMap[kw]);
          }
        }
      }
      if (token === '<u>') {
        ctx.addFormat(IS_UNDERLINE);
      }
      if (token === '</u>') {
        ctx.removeFormat(IS_UNDERLINE);
      }
    }

    return {
      token,
      text: type === 'text' ? token : undefined,
      format: ctx.getFormatUnion(),
      type: 'text'
    };
  }
}

export const MARKDOWN_PARSER = new MarkdownParser();
