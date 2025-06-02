import { KiwimeriLexer, KiwimeriLexerBlock, KiwimeriParser } from '../parser';

class MarkdownLexer extends KiwimeriLexer {
  // blocks: paragraph, quote, heading, list, horizontalrule
  public nextBlock(): KiwimeriLexerBlock | null {
    if (this.blockIdx > this.text.length - 1) {
      return null;
    }
    const nextBlock = this.text.substring(this.blockIdx);

    // heading
    if (nextBlock[0] === '#') {
      return { text: this.endOfBlock(nextBlock), type: 'heading' };
    }

    // horizontalrule
    if (nextBlock.startsWith('---')) {
      return { text: this.endOfBlock(nextBlock), type: 'horizontalrule' };
    }

    // quote
    if (nextBlock.startsWith('>')) {
      return { text: this.endOfBlock(nextBlock), type: 'quote' };
    }

    // list
    if (nextBlock.startsWith('- ') || nextBlock.match(/^\d+\. /g)) {
      return { text: this.endOfBlock(nextBlock, true), type: 'list' };
    }

    // empty paragraphs
    if (nextBlock.match(/^\n+/g)) {
      return { text: '\n', type: 'paragraph' };
    }
    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) {
      return { text: this.endOfBlock(nextBlock), type: 'paragraph' };
    }

    // the default block: paragraph
    return { text: this.endOfBlock(nextBlock, true), type: 'paragraph' };
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

  public nextText(block: string): string | null {
    if (this.textIdx > block.length - 1) {
      return null;
    }
    // const nextText = block.indexOf('\n');
    return block;
  }
}

export class MarkdownParser extends KiwimeriParser {
  protected getLexer(text: string, opts?: unknown): KiwimeriLexer {
    return new MarkdownLexer(text, opts);
  }
}

export const MARKDOWN_PARSER = new MarkdownParser();
