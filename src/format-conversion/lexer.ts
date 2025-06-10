export type KiwimeriLexerBlock = {
  token: string;
};

export type KiwimeriLexerText = {
  token: string;
};

export abstract class KiwimeriLexer {
  protected blockIdx = 0;
  protected textIdx = 0;
  protected tempBlock?: KiwimeriLexerBlock | null;
  protected tempText?: KiwimeriLexerText | null;

  constructor(
    protected text: string,
    protected opts?: unknown
  ) {}

  /** blocks: paragraph, quote, heading, list, horizontalrule */
  protected abstract _nextBlock(): KiwimeriLexerBlock | null;
  public nextBlock(): KiwimeriLexerBlock | null {
    this.tempBlock = this._nextBlock();
    return this.tempBlock;
  }
  public consumeBlock(): KiwimeriLexerBlock | null {
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
  protected abstract _nextText(block: string): KiwimeriLexerText | null;
  public nextText(block: string): KiwimeriLexerText | null {
    this.tempText = this._nextText(block);
    return this.tempText;
  }
  public consumeText(block: string): KiwimeriLexerText | null {
    const token =
      this.tempText !== undefined ? this.tempText : this.nextText(block);
    if (token === null || token.token.length === 0) {
      return null;
    }
    this.textIdx += token.token.length;
    this.tempText = undefined;
    return token;
  }
}
