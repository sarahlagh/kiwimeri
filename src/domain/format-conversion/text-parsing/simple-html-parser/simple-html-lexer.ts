import { KiwimeriTextLexer } from '../text-lexer';
import { KiwimeriLexerResponse, KiwimeriParserTextBlock } from '../types';
import { PARAGRAPH, SIMPLE_HTML_BLOCKS } from './simple-html-blocks';
import { SIMPLE_HTML_ELEMENTS } from './simple-html-elements';
import { SimpleHtmlParserOpts } from './simple-html-parser';

export class SimpleHtmlLexer extends KiwimeriTextLexer<SimpleHtmlParserOpts> {
  // blocks: paragraph, quote, heading, list, horizontalrule
  protected _nextBlock(): KiwimeriLexerResponse<SimpleHtmlParserOpts> | null {
    if (this.blockIdx > this.text.length - 1) {
      return null;
    }
    const nextBlock = this.text.substring(this.blockIdx);

    for (const blockParser of SIMPLE_HTML_BLOCKS) {
      const token = blockParser.tokenize(nextBlock);
      if (token) {
        return {
          token,
          type: 'text',
          blockParser
        };
      }
    }

    // shouldn't happen
    return {
      token: nextBlock,
      type: 'text',
      blockParser: PARAGRAPH
    };
  }

  // texts: text, linebreak, listitem
  protected _nextText(
    block: KiwimeriParserTextBlock
  ): KiwimeriLexerResponse<SimpleHtmlParserOpts> | null {
    if (this.textIdx > block.text.length - 1) {
      return null;
    }
    const nextText = block.text.substring(this.textIdx);
    if (nextText.trimEnd().length === 0) {
      return null;
    }
    for (const elemParser of SIMPLE_HTML_ELEMENTS) {
      if (!elemParser.tokenize) continue;
      const token = elemParser.tokenize(nextText, block, false, this.opts);
      if (token) {
        return {
          token,
          type: elemParser.type,
          elemParser
        };
      }
    }

    // shouldn't happen
    return {
      token: nextText,
      type: 'text'
    };
  }
}
