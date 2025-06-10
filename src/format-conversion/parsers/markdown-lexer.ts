import { KiwimeriLexer, KiwimeriLexerResponse } from '../lexer';
import { KiwimeriParserBlock } from '../parser';

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
        token: this.endOfBlock(nextBlock)
      };
    }

    // quote
    if (nextBlock.startsWith('>')) {
      return {
        token: this.endOfBlock(nextBlock)
      };
    }

    // horizontalrule
    if (nextBlock.startsWith('---')) {
      return {
        token: this.endOfBlock(nextBlock)
      };
    }

    // list
    if (nextBlock.startsWith('- ') || nextBlock.match(/^\d+\. /g)) {
      return {
        token: this.endOfBlock(nextBlock, true)
      };
    }

    // empty paragraphs
    if (nextBlock.match(/^\n+/g)) {
      return {
        token: '\n'
      };
    }

    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) {
      return {
        token: this.endOfBlock(nextBlock)
      };
    }

    // the default block: paragraph
    return {
      token: this.endOfBlock(nextBlock, true)
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

  private endOfListItem(nextBlock: string) {
    let line = this.endOfBlock(nextBlock);
    // does line have a line break? if yes merge as single token
    let hasIndentNext = nextBlock
      .substring(line.length)
      .match(/^[ \t]+[^ \t\n]+/g);
    while (hasIndentNext) {
      line += this.endOfBlock(nextBlock.substring(line.length));
      hasIndentNext = nextBlock
        .substring(line.length)
        .match(/^[ \t]+[^ \t\n]+/g);
    }
    return line;
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
    // TODO handle alternatives (** and __)
    if (nextText.startsWith('**')) {
      const endOfText = nextText.substring(2).indexOf('**') + 2;
      const token = nextText.substring(0, endOfText + 2);
      return {
        token
      };
    }
    if (nextText.startsWith('*')) {
      const endOfText = nextText.substring(1).indexOf('*') + 1;
      const token = nextText.substring(0, endOfText + 1);
      return {
        token
      };
    }
    if (nextText.startsWith('~~')) {
      const endOfText = nextText.substring(2).indexOf('~~') + 2;
      const token = nextText.substring(0, endOfText + 2);
      return {
        token
      };
    }
    if (nextText.startsWith('<u>')) {
      const endOfText = nextText.indexOf('</u>');
      const token = nextText.substring(0, endOfText + 4);
      return {
        token
      };
    }
    if (nextText.startsWith('<p')) {
      const endOfText = nextText.indexOf('</p>');
      const token = nextText.substring(0, endOfText + 4);
      return {
        token
      };
    }
    if (nextText.startsWith('-')) {
      const token = this.endOfListItem(nextText);
      return {
        token
      };
    }
    const numberedList = nextText.match(/^\d+\./g);
    if (numberedList) {
      const token = this.endOfListItem(nextText);
      return {
        token
      };
    }
    if (nextText.startsWith('\n') && !nextText.startsWith('\n\n')) {
      return {
        token: '\n'
      };
    }
    // TODO what of escaped *~< ?
    const endOfText = nextText.match(/^([^*~<\n]*)/g);
    if (endOfText && endOfText.length > 0) {
      return {
        token: endOfText[0]
      };
    }
    return {
      token: nextText
    };
  }
}
