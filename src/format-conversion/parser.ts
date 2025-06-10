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

type KiwimeriParserBlockType =
  | 'paragraph'
  | 'quote'
  | 'heading'
  | 'list'
  | 'horizontalrule';
export type KiwimeriParserBlock = {
  text: string;
  token: string;
  type: KiwimeriParserBlockType;
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

  protected abstract parseText(
    token: string,
    block: KiwimeriParserBlock,
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
        while (lexer.nextText(block) !== null) {
          const lexerText = lexer.consumeText(block);
          const blockText = this.parseText(lexerText!.token, block, opts);
          console.log('text', blockText);
          const child: SerializedLexicalNode = this.handleText(
            blockText!,
            block
          );
          if (block.paragraphAlign) {
            elementNode.format = block.paragraphAlign;
          }
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
    blockOrText?: KiwimeriParserBlock | KiwimeriParserText,
    block?: KiwimeriParserBlock
  ): SerializedLexicalNode {
    const node: SerializedLexicalNode = {
      type: lexerText.type,
      version: 1
    };
    if (node.type === 'text' && lexerText.text) {
      (node as SerializedTextNode).text = lexerText.text;
      (node as SerializedTextNode).format = lexerText.format || 0;
    }
    if (block?.type === 'list' && blockOrText?.type === 'listitem') {
      (node as SerializedTextNode).detail = 0;
      (node as SerializedTextNode).mode = 'normal';
      (node as SerializedTextNode).style = '';
    }
    // special case for lists
    if (node.type === 'listitem' && lexerText.text) {
      (node as SerializedElementNode).children = [];
      const lexem = this.parseRaw(lexerText, 'list');
      lexem.forEach(lex => {
        console.log('listitem lex', lex);
        (node as SerializedElementNode).children.push(
          this.handleText(lex, lexerText, blockOrText as KiwimeriParserBlock)
        );
      });
    }
    if (blockOrText && lexerText.paragraphFormat) {
      (blockOrText as KiwimeriParserBlock).paragraphAlign =
        lexerText.paragraphFormat as ElementFormatType; // TODO handle error
    }
    return node;
  }

  private parseRaw(
    parserText: KiwimeriParserText,
    blockType: KiwimeriParserBlockType = 'paragraph',
    opts?: unknown
  ): KiwimeriParserText[] {
    if (parserText.text?.length === 0) {
      return [];
    }
    const lexer = this.getLexer(parserText.token, opts);
    const texts: KiwimeriParserText[] = [];
    const block: KiwimeriParserBlock = {
      text: parserText.text!,
      token: parserText.token,
      type: blockType
    };
    while (lexer.nextText(block) !== null) {
      const { token } = lexer.consumeText(block)!;
      texts.push(this.parseText(token, block, opts));
    }
    return texts;
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
