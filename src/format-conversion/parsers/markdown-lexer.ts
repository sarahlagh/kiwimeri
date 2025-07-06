import { KiwimeriLexer, KiwimeriLexerResponse } from '../lexer';
import { KiwimeriParserBlock } from '../parser-context';

export class MarkdownLexer extends KiwimeriLexer {
  // blocks: paragraph, quote, heading, list, horizontalrule
  protected _nextBlock(): KiwimeriLexerResponse | null {
    if (this.blockIdx > this.text.length - 1) {
      return null;
    }
    const nextBlock = this.text.substring(this.blockIdx);

    // heading
    const heading = nextBlock.match(/^(#+)/g);
    if (heading) {
      return {
        token: this.endOfBlock(nextBlock),
        type: 'text'
      };
    }

    // quote
    if (nextBlock.startsWith('>')) {
      return {
        token: this.endOfBlock(nextBlock),
        type: 'text'
      };
    }

    // horizontalrule
    if (nextBlock.startsWith('---')) {
      return {
        token: this.endOfBlock(nextBlock),
        type: 'text'
      };
    }

    // list
    if (nextBlock.startsWith('- ') || nextBlock.match(/^\d+\. /g)) {
      return {
        token: this.endOfBlock(nextBlock, true),
        type: 'text'
      };
    }

    // empty paragraphs
    if (nextBlock.match(/^\n+/g)) {
      return {
        token: '\n',
        type: 'text'
      };
    }

    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) {
      return {
        token: this.endOfBlock(nextBlock),
        type: 'text'
      };
    }

    // the default block: paragraph
    return {
      token: this.endOfBlock(nextBlock, true),
      type: 'text'
    };
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
  protected _nextText(
    block: KiwimeriParserBlock
  ): KiwimeriLexerResponse | null {
    if (this.textIdx > block.text.length - 1) {
      return null;
    }
    const nextText = block.text.substring(this.textIdx);
    if (nextText.trimEnd().length === 0) {
      return null;
    }
    for (const kw of ['**', '*', '__', '_', '~~', '<u>', '</u>', '</p>']) {
      if (nextText.startsWith(kw)) {
        return { token: kw, type: 'keyword' };
      }
    }
    const pEl = nextText.match(/^<p[^>]*>/g);
    if (pEl) {
      return {
        token: pEl[0],
        type: 'keyword'
      };
    }
    const unorderedList = nextText.match(/^- ?/g);
    if (unorderedList && this.isStartOfLine(block.text)) {
      return {
        token: unorderedList[0],
        type: 'keyword'
      };
    }
    const numberedList = nextText.match(/^\d+\. /g);
    if (numberedList && this.isStartOfLine(block.text)) {
      return {
        token: numberedList[0],
        type: 'keyword'
      };
    }

    if (nextText.startsWith('\n') && !nextText.startsWith('\n\n')) {
      return {
        token: '\n',
        type: 'text'
      };
    }

    // TODO what of escaped *~< ?
    const endOfText = nextText.match(/^([^*~<\n]*)/g);
    if (endOfText && endOfText.length > 0) {
      return {
        token: endOfText[0],
        type: 'text'
      };
    }
    return {
      token: nextText,
      type: 'text'
    };
  }

  protected isStartOfLine(blockText: string) {
    return this.textIdx === 0 || blockText[this.textIdx - 1] === '\n';
  }
}
