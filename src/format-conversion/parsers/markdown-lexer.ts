import { KiwimeriLexer, KiwimeriLexerResponse } from '../lexer';
import { KiwimeriParserBlock } from '../parser-context';
import { ALL_BLOCKS, PARAGRAPH } from './markdown-blocks';
import { ALL_ELEMENTS } from './markdown-elements';

export class MarkdownLexer extends KiwimeriLexer {
  // blocks: paragraph, quote, heading, list, horizontalrule
  protected _nextBlock(): KiwimeriLexerResponse | null {
    if (this.blockIdx > this.text.length - 1) {
      return null;
    }
    const nextBlock = this.text.substring(this.blockIdx);

    for (const blockParser of ALL_BLOCKS) {
      const token = blockParser.tokenize(nextBlock);
      if (token) {
        return {
          token,
          type: 'text',
          blockParser
        };
      }
    }

    // the default block: paragraph
    return {
      token: this.endOfBlock(nextBlock, true),
      type: 'text',
      blockParser: PARAGRAPH
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
    for (const elemParser of ALL_ELEMENTS) {
      if (!elemParser.tokenize) continue;
      const token = elemParser.tokenize(
        nextText,
        block,
        this.isStartOfLine(block.text)
      );
      if (token) {
        return {
          token,
          type: elemParser.type,
          elemParser
        };
      }
    }

    // shouldn't happen?
    return {
      token: nextText,
      type: 'text'
    };
  }

  protected isStartOfLine(blockText: string) {
    return this.textIdx === 0 || blockText[this.textIdx - 1] === '\n';
  }
}
