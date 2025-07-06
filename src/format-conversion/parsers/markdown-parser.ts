import { KiwimeriLexer } from '../lexer';
import {
  KiwimeriParser,
  KiwimeriParserBlock,
  KiwimeriParserContext,
  KiwimeriParserText
} from '../parser';
import { MarkdownLexer } from './markdown-lexer';

export class MarkdownParser extends KiwimeriParser {
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

    if (ctx.lastBlock?.type === 'list' && type === 'keyword') {
      // TODO
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

    return {
      token,
      text: type === 'text' ? token : undefined,
      format: 0, // TODO
      type: 'text'
    };

    // TODO handle alternatives (** and __)

    // // TODO not gonna work with nested styles but anyway...
    // if (token.startsWith('**')) {
    //   const previousPropagatesFormat =
    //     ctx.texts.find(
    //       t => t.format === IS_BOLD && t.propagatesFormat === true
    //     ) !== undefined || false;
    //   // problem with *** is that. i'd need an empty string with ** and inner token with *
    //   const propagatesFormat =
    //     !previousPropagatesFormat &&
    //     (!token.endsWith('**') || token.length === 2);
    //   const endOfText = propagatesFormat ? token.length + 1 : token.length - 2;
    //   return {
    //     text: token.substring(2, endOfText),
    //     type: 'text',
    //     format: IS_BOLD,
    //     propagatesFormat,
    //     token
    //   };
    // }
    // if (token.startsWith('*')) {
    //   return {
    //     text: token.substring(1, token.length - 1),
    //     type: 'text',
    //     format: IS_ITALIC,
    //     token
    //   };
    // }
    // if (token.startsWith('~~')) {
    //   return {
    //     text: token.substring(2, token.length - 2),
    //     type: 'text',
    //     format: IS_STRIKETHROUGH,
    //     token
    //   };
    // }
    // if (token.startsWith('<u>')) {
    //   return {
    //     text: token.substring(3, token.length - 4),
    //     type: 'text',
    //     format: IS_UNDERLINE,
    //     token
    //   };
    // }
    // if (token.startsWith('<p')) {
    //   const endOfOpeningTag = token.indexOf('>');
    //   const textAlign = /text-align: ([a-z]+);/g.exec(token);
    //   let paragraphFormat: string | undefined = undefined;
    //   if (textAlign && textAlign.length > 0) {
    //     paragraphFormat = textAlign[1];
    //   }
    //   return {
    //     text: token.substring(endOfOpeningTag + 1, token.length - 4),
    //     type: 'text',
    //     format: 0,
    //     token,
    //     paragraphFormat
    //   };
    // }
    // if (token.startsWith('\n') && !token.startsWith('\n\n')) {
    //   return {
    //     type: 'linebreak',
    //     token: '\n'
    //   };
    // }
    // if (token.startsWith('-')) {
    //   return {
    //     token,
    //     text: token.replace('-', '').trimStart(),
    //     type: 'listitem'
    //   };
    // }
    // const numberedList = token.match(/^\d+\./g);
    // if (numberedList) {
    //   return {
    //     token,
    //     text: token.replace(numberedList[0], '').trimStart(),
    //     type: 'listitem'
    //   };
    // }
    // // TODO what of escaped *~< ?
    // const endOfText = token.match(/^([^*~<\n]*)/g);
    // if (endOfText && endOfText.length > 0) {
    //   return {
    //     text: endOfText[0],
    //     type: 'text',
    //     format: 0,
    //     token: endOfText[0]
    //   };
    // }
    // return {
    //   text: token,
    //   type: 'text',
    //   format: 0,
    //   token
    // };
  }
}

export const MARKDOWN_PARSER = new MarkdownParser();
