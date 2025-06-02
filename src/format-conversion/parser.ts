import {
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode
} from 'lexical';

export type KiwimeriLexerBlock = {
  text: string;
  type: 'paragraph' | 'quote' | 'heading' | 'list' | 'horizontalrule';
};

export abstract class KiwimeriLexer {
  protected blockIdx = 0;
  protected textIdx = 0;
  constructor(
    protected text: string,
    protected opts?: unknown
  ) {}

  /** blocks: paragraph, quote, heading, list, horizontalrule */
  public abstract nextBlock(): KiwimeriLexerBlock | null;
  public consumeBlock(): KiwimeriLexerBlock | null {
    const block = this.nextBlock();
    if (block === null || block.text.length === 0) {
      return null;
    }
    this.blockIdx += block.text.length;
    this.textIdx = 0;
    return block;
  }

  public abstract nextText(block: string): string | null;
  public consumeText(block: string): string | null {
    const token = this.nextText(block);
    if (token === null || token.length === 0) {
      return null;
    }
    this.textIdx += token.length;
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
          const text = lexer.consumeText(block.text);
          console.log('text', text);
          elementNode.children.push(this.handleText(text!, block));
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
    text: string,
    block: KiwimeriLexerBlock
  ): SerializedLexicalNode {
    return {
      type: 'text',
      version: 1
    };
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
