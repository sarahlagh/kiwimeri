import { IS_BOLD, IS_ITALIC, IS_STRIKETHROUGH, IS_UNDERLINE } from 'lexical';
import {
  KiwimeriLexer,
  KiwimeriLexerBlock,
  KiwimeriLexerText,
  KiwimeriParser
} from '../parser';

class MarkdownLexer extends KiwimeriLexer {
  // blocks: paragraph, quote, heading, list, horizontalrule
  protected _nextBlock(): KiwimeriLexerBlock | null {
    if (this.blockIdx > this.text.length - 1) {
      return null;
    }
    const nextBlock = this.text.substring(this.blockIdx);

    // heading
    const heading = nextBlock.match(/^(#+)/g);
    if (heading) {
      const token = this.endOfBlock(nextBlock);
      return {
        token,
        text: token.replace(heading[0], '').trimStart(),
        type: 'heading'
      };
    }

    // quote
    if (nextBlock.startsWith('>')) {
      const token = this.endOfBlock(nextBlock);
      return { token, text: token.replace('>', '').trimStart(), type: 'quote' };
    }

    // horizontalrule
    if (nextBlock.startsWith('---')) {
      return {
        token: this.endOfBlock(nextBlock),
        text: '',
        type: 'horizontalrule'
      };
    }

    // list
    if (nextBlock.startsWith('- ') || nextBlock.match(/^\d+\. /g)) {
      const token = this.endOfBlock(nextBlock, true);
      return { token, text: token, type: 'list' };
    }

    // empty paragraphs
    if (nextBlock.match(/^\n+/g)) {
      return { token: '\n', text: '', type: 'paragraph' };
    }
    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) {
      const token = this.endOfBlock(nextBlock);
      return { token, text: token, type: 'paragraph' };
    }

    // the default block: paragraph
    const token = this.endOfBlock(nextBlock, true);
    return { token, text: token, type: 'paragraph' };
  }

  private endOfBlock(nextBlock: string, strictParagraph = false) {
    if (strictParagraph) {
      const endOfBlock = nextBlock.indexOf('\n\n');
      if (endOfBlock < 0) {
        return nextBlock;
      }
      return nextBlock.substring(0, endOfBlock + 2);
    } else {
      const endOfBlock = nextBlock.indexOf('\n');
      if (endOfBlock < 0) {
        return nextBlock;
      }
      if (nextBlock[endOfBlock + 1] === '\n') {
        return nextBlock.substring(0, endOfBlock + 2);
      }
      return nextBlock.substring(0, endOfBlock + 1);
    }
  }

  // texts: text, linebreak, listitem
  protected _nextText(block: string): KiwimeriLexerText | null {
    if (this.textIdx > block.length - 1) {
      return null;
    }
    const nextText = block.substring(this.textIdx);
    if (nextText.trimEnd().length === 0) {
      return null;
    }
    // TODO not gonna work with nested styles but anyway...
    // TODO handle alternatives (** and __)
    if (nextText.startsWith('**')) {
      const endOfText = nextText.substring(2).indexOf('**') + 2;
      const token = nextText.substring(0, endOfText + 2);
      return {
        text: token.substring(2, token.length - 2),
        type: 'text',
        format: IS_BOLD,
        token
      };
    }
    if (nextText.startsWith('*')) {
      const endOfText = nextText.substring(1).indexOf('*') + 1;
      const token = nextText.substring(0, endOfText + 1);
      return {
        text: token.substring(1, token.length - 1),
        type: 'text',
        format: IS_ITALIC,
        token
      };
    }
    if (nextText.startsWith('~~')) {
      const endOfText = nextText.substring(2).indexOf('~~') + 2;
      const token = nextText.substring(0, endOfText + 2);
      return {
        text: token.substring(2, token.length - 2),
        type: 'text',
        format: IS_STRIKETHROUGH,
        token
      };
    }
    if (nextText.startsWith('<u>')) {
      const endOfText = nextText.indexOf('</u>');
      const token = nextText.substring(0, endOfText + 4);
      return {
        text: token.substring(3, token.length - 4),
        type: 'text',
        format: IS_UNDERLINE,
        token
      };
    }
    if (nextText.startsWith('<p')) {
      const endOfOpeningTag = nextText.indexOf('>');
      const endOfText = nextText.indexOf('</p>');
      const token = nextText.substring(0, endOfText + 4);
      const textAlign = /text-align: ([a-z]+);/g.exec(token);
      let paragraphFormat: string | undefined = undefined;
      if (textAlign && textAlign.length > 0) {
        paragraphFormat = textAlign[1];
      }
      return {
        text: token.substring(endOfOpeningTag + 1, token.length - 4),
        type: 'text',
        format: 0,
        token,
        paragraphFormat
      };
    }
    if (nextText.startsWith('\n') && !nextText.startsWith('\n\n')) {
      return {
        type: 'linebreak',
        token: '\n'
      };
    }
    if (nextText.startsWith('-')) {
      const token = this.endOfBlock(nextText);
      return {
        token,
        text: token.replace('-', '').trimStart(),
        type: 'listitem'
      };
    }
    const numberedList = nextText.match(/^\d+\./g);
    if (numberedList) {
      const token = this.endOfBlock(nextText);
      return {
        token,
        text: token.replace(numberedList[0], '').trimStart(),
        type: 'listitem'
      };
    }
    // TODO what of escaped *~< ?
    const endOfText = nextText.match(/^([^*~<\n]*)/g);
    if (endOfText && endOfText.length > 0) {
      return {
        text: endOfText[0],
        type: 'text',
        format: 0,
        token: endOfText[0]
      };
    }
    return {
      text: nextText,
      type: 'text',
      format: 0,
      token: nextText
    };
  }
}

export class MarkdownParser extends KiwimeriParser {
  protected getLexer(text: string, opts?: unknown): KiwimeriLexer {
    return new MarkdownLexer(text, opts);
  }
}

export const MARKDOWN_PARSER = new MarkdownParser();
