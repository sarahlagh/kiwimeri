import {
  ElementFormatType,
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode,
  SerializedTextNode
} from 'lexical';
import { KiwimeriLexer } from './lexer';

export type KiwimeriParserResponse = {
  obj: SerializedEditorState | null;
  errors?: string[];
};

export type KiwimeriParserBlock = {
  text: string;
  token: string;
  type: 'paragraph' | 'quote' | 'heading' | 'list' | 'horizontalrule';
  paragraphAlign?: ElementFormatType;
};

export type KiwimeriParserText = {
  text?: string;
  token: string;
  type: 'text' | 'linebreak' | 'listitem';
  format?: number;
  paragraphFormat?: string; //'center' | 'right';
};

export abstract class KiwimeriParser {
  constructor() {}

  protected abstract getLexer(text: string, opts?: unknown): KiwimeriLexer;

  public tokenizeAndParseText(
    text: string,
    opts?: unknown
  ): KiwimeriParserText[] {
    const lexer = this.getLexer(text, opts);
    const texts: KiwimeriParserText[] = [];
    while (lexer.nextText(text) !== null) {
      const { token } = lexer.consumeText(text)!;
      texts.push(this.parseText(token, opts));
    }
    return texts;
  }

  protected abstract parseText(
    token: string,
    opts?: unknown
  ): KiwimeriParserText;

  protected abstract parseBlock(
    token: string,
    opts?: unknown
  ): KiwimeriParserBlock;

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
      const { token } = lexer.consumeBlock()!;
      const block = this.parseBlock(token);
      const elementNode = this.handleBlock(block);
      console.log('block', block);
      if ('children' in elementNode) {
        while (lexer.nextText(block.text) !== null) {
          const lexerText = lexer.consumeText(block.text);
          const blockText = this.parseText(lexerText!.token);
          console.log('text', blockText);
          const child: SerializedLexicalNode = this.handleText(
            blockText!,
            block
          );
          if (block.paragraphAlign) {
            elementNode.format = block.paragraphAlign;
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
    block: KiwimeriParserBlock
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
    lexerText: KiwimeriParserText,
    block?: KiwimeriParserBlock | KiwimeriParserText
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
      const lexem = this.tokenizeAndParseText(lexerText.text);
      lexem.forEach(lex => {
        (node as SerializedElementNode).children.push(
          this.handleText(lex, lexerText)
        );
      });
    }
    if (block && lexerText.paragraphFormat) {
      (block as KiwimeriParserBlock).paragraphAlign =
        lexerText.paragraphFormat as ElementFormatType; // TODO handle error
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
