import { KiwimeriLexer, KiwimeriLexerBlock, KiwimeriLexerText } from '../lexer';

export class MarkdownLexer extends KiwimeriLexer {
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
        token
      };
    }

    // quote
    if (nextBlock.startsWith('>')) {
      const token = this.endOfBlock(nextBlock);
      return {
        token
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
      const token = this.endOfBlock(nextBlock, true);
      return {
        token
      };
    }

    // empty paragraphs
    if (nextBlock.match(/^\n+/g)) {
      return {
        token: '\n'
      };
    }
    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) {
      const token = this.endOfBlock(nextBlock);
      return {
        token
      };
    }

    // the default block: paragraph
    const token = this.endOfBlock(nextBlock, true);
    return {
      token
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
  protected _nextText(block: string): KiwimeriLexerText | null {
    if (this.textIdx > block.length - 1) {
      return null;
    }
    const nextText = block.substring(this.textIdx);
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
      //   const endOfOpeningTag = nextText.indexOf('>');
      const endOfText = nextText.indexOf('</p>');
      const token = nextText.substring(0, endOfText + 4);
      //   const textAlign = /text-align: ([a-z]+);/g.exec(token);
      //   let paragraphFormat: string | undefined = undefined;
      //   if (textAlign && textAlign.length > 0) {
      //     paragraphFormat = textAlign[1];
      //   }
      return {
        // text: token.substring(endOfOpeningTag + 1, token.length - 4),
        // type: 'text',
        // format: 0,
        token
        // paragraphFormat
      };
    }
    if (nextText.startsWith('\n') && !nextText.startsWith('\n\n')) {
      return {
        token: '\n'
      };
    }
    if (nextText.startsWith('-')) {
      const token = this.endOfBlock(nextText);
      return {
        token
      };
    }
    const numberedList = nextText.match(/^\d+\./g);
    if (numberedList) {
      const token = this.endOfBlock(nextText);
      return {
        token
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
