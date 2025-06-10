import {
  ElementFormatType,
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode,
  SerializedTextNode
} from 'lexical';

export type KiwimeriLexerBlock = {
  text: string;
  token: string;
  type: 'paragraph' | 'quote' | 'heading' | 'list' | 'horizontalrule';
  format?: ElementFormatType;
};

export type KiwimeriLexerText = {
  text?: string;
  token: string;
  type: 'text' | 'linebreak' | 'listitem';
  format?: number;
  paragraphFormat?: string; //'center' | 'right';
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

export type KiwimeriParserResponse = {
  obj: SerializedEditorState | null;
  errors?: string[];
};

export abstract class KiwimeriParser {
  constructor() {}

  protected abstract getLexer(text: string, opts?: unknown): KiwimeriLexer;

  public parseText(text: string, opts?: unknown): KiwimeriLexerText[] {
    const lexer = this.getLexer(text, opts);
    const texts: KiwimeriLexerText[] = [];
    while (lexer.nextText(text) !== null) {
      texts.push(lexer.consumeText(text)!);
    }
    return texts;
  }

  public parse(text: string, opts?: unknown): KiwimeriParserResponse {
    const root: SerializedRootNode = {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: []
    };

    const lexer = this.getLexer(text, opts);

    while (lexer.nextBlock() !== null) {
      const block = lexer.consumeBlock()!;
      const elementNode = this.handleBlock(block);
      console.log('block', block);
      if ('children' in elementNode) {
        while (lexer.nextText(block.text) !== null) {
          const blockText = lexer.consumeText(block.text);
          console.log('text', blockText);
          const child: SerializedLexicalNode = this.handleText(
            blockText!,
            block
          );
          if (block.format) {
            elementNode.format = block.format;
          }
          // special case for lists
          // if (blockText?.type === 'listitem' && blockText.text) {
          //   const lexem = this.parseText(blockText.text);
          //   console.log('lexem', lexem);
          //   lexem.forEach(lex => {
          //     const subChild: SerializedLexicalNode = this.handleText(
          //       lex,
          //       blockText
          //     );

          //   });
          //   // while (lexer.nextText())
          //   // const listText = lexer.consumeText(block.text);
          // }
          elementNode.children.push(child);
        }
      }
      root.children.push(elementNode);
    }
    return { obj: { root } };
  }

  private handleBlock(
    block: KiwimeriLexerBlock
  ): SerializedLexicalNode | SerializedElementNode {
    const node: SerializedLexicalNode = {
      type: block.type,
      version: 1
    };
    switch (block.type) {
      case 'heading':
      case 'list':
      case 'quote':
      case 'paragraph':
        return this.defaultElementNode(node);
      case 'horizontalrule':
        return node;
    }
  }

  private handleText(
    lexerText: KiwimeriLexerText,
    block?: KiwimeriLexerBlock | KiwimeriLexerText
  ): SerializedLexicalNode {
    const node: SerializedLexicalNode = {
      type: lexerText.type,
      version: 1
    };
    if (node.type === 'text' && lexerText.text) {
      (node as SerializedTextNode).text = lexerText.text;
      (node as SerializedTextNode).format = lexerText.format || 0;
    }
    // special case for lists
    if (node.type === 'listitem' && lexerText.text) {
      (node as SerializedElementNode).children = [];
      const lexem = this.parseText(lexerText.text);
      lexem.forEach(lex => {
        (node as SerializedElementNode).children.push(
          this.handleText(lex, lexerText)
        );
      });
    }
    if (block && lexerText.paragraphFormat) {
      block.format = lexerText.paragraphFormat as ElementFormatType; // TODO handle error
    }
    return node;
  }

  private defaultElementNode(
    node: SerializedLexicalNode
  ): SerializedElementNode {
    return {
      ...node,
      direction: null,
      format: '',
      indent: 0,
      children: []
    };
  }
}
