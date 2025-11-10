import { ElementFormatType, SerializedLexicalNode } from 'lexical';
import { KiwimeriParserBlock, KiwimeriParserContext } from './parser-context';

type KiwimeriLexicalBlockParserCtx = {
  paragraphAlign?: ElementFormatType;
};
export type KiwimeriLexicalBlockParser = {
  name?: string;
  tokenize: (nextBlock: string) => string | null;
  parse: (
    token: string,
    ctx?: KiwimeriLexicalBlockParserCtx
  ) => KiwimeriParserBlock | null;
  transformChild?: (
    text: string,
    ctx: KiwimeriParserContext,
    blockData: unknown
  ) => string;
};

export type KiwimeriLexicalElementParser = {
  name?: string;
  type: KiwimeriLexerResponseType;
  tokenize: (
    nextText: string,
    block: KiwimeriParserBlock,
    isStartOfLine: boolean
  ) => string | null;
  matches?: (nextText: string) => boolean;
  textFormat?: number;
  parse?: (
    token: string,
    ctx: KiwimeriParserContext,
    lexer: KiwimeriLexer
  ) => SerializedLexicalNode | null;
  propagateTextFormat?: boolean;
  captures?: (resp: KiwimeriLexerResponse) => boolean;
};

export type KiwimeriLexerResponseType = 'text' | 'keyword';
export type KiwimeriLexerResponse = {
  token: string;
  type: KiwimeriLexerResponseType;
  blockParser?: KiwimeriLexicalBlockParser;
  elemParser?: KiwimeriLexicalElementParser;
};

export abstract class KiwimeriLexer {
  protected blockIdx = 0;
  protected textIdx = 0;
  protected tempBlock?: KiwimeriLexerResponse | null;
  protected tempText?: KiwimeriLexerResponse | null;

  constructor(
    protected text: string,
    protected opts?: unknown
  ) {}

  /** blocks: paragraph, quote, heading, list, horizontalrule */
  protected abstract _nextBlock(): KiwimeriLexerResponse | null;
  public nextBlock(): KiwimeriLexerResponse | null {
    this.tempBlock = this._nextBlock();
    return this.tempBlock;
  }
  public consumeBlock(): KiwimeriLexerResponse | null {
    const block =
      this.tempBlock !== undefined ? this.tempBlock : this.nextBlock();
    if (block === null || block.token.length === 0) {
      return null;
    }
    this.blockIdx += block.token.length;
    this.textIdx = 0;
    this.tempBlock = undefined;
    return block;
  }

  /** texts: text, linebreak, listitem */
  protected abstract _nextText(
    block: KiwimeriParserBlock
  ): KiwimeriLexerResponse | null;
  public nextText(block: KiwimeriParserBlock): KiwimeriLexerResponse | null {
    this.tempText = this._nextText(block);
    return this.tempText;
  }
  public consumeText(
    parentNode: KiwimeriParserBlock
  ): KiwimeriLexerResponse | null {
    const resp =
      this.tempText !== undefined ? this.tempText : this.nextText(parentNode);
    if (resp === null || resp.token.length === 0) {
      return null;
    }
    this.textIdx += resp.token.length;
    this.tempText = undefined;
    return resp;
  }
}
