/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode,
  SerializedTextNode
} from 'lexical';
import { KiwimeriLexer } from './lexer';
import {
  KiwimeriParserBlock,
  KiwimeriParserContext,
  KiwimeriParserText
} from './parser-context';

export type KiwimeriParserResponse = {
  obj: SerializedEditorState | null;
  errors?: string[];
};

export abstract class KiwimeriParser {
  constructor() {}

  protected abstract getLexer(text: string, opts?: unknown): KiwimeriLexer;

  protected abstract parseText(
    token: string,
    type: 'text' | 'keyword',
    ctx: KiwimeriParserContext,
    opts?: unknown
  ): KiwimeriParserText | null;

  protected abstract parseBlock(
    token: string,
    ctx: KiwimeriParserContext,
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
    const ctx = new KiwimeriParserContext();

    const lexer = this.getLexer(text, opts);

    while (lexer.nextBlock() !== null) {
      const { token } = lexer.consumeBlock()!;
      ctx.resetBlock();
      const block = this.parseBlock(token, ctx.copy());
      ctx.addBlock(block);
      const elementNode = this.convertBlockToLexical(block);
      console.log('block', block);
      if ('children' in elementNode) {
        while (lexer.nextText(block) !== null) {
          const lexerText = lexer.consumeText(block);
          ctx.nextText = lexer.nextText(block);
          const parsedText = this.parseText(
            lexerText!.token,
            lexerText!.type,
            ctx.copy(),
            opts
          );

          if (parsedText === null) {
            continue;
          }

          if (parsedText.paragraphAlign !== undefined) {
            ctx.paragraphAlign = parsedText.paragraphAlign;
          }

          if (lexerText?.type === 'keyword') {
            ctx.addKeyword(parsedText);
            console.log('keyword', parsedText);
            if (parsedText.type === 'listitem') {
              const child: SerializedLexicalNode = {
                type: 'listitem',
                version: 1
              };
              (child as SerializedElementNode).children = [];
              elementNode.children.push(child);
            }
          }

          if (lexerText?.type === 'text') {
            ctx.addText(parsedText);
            console.log('text', parsedText);
            const child: SerializedLexicalNode = this.convertTextToLexical(
              parsedText!
            );
            if (ctx.paragraphAlign) {
              elementNode.format = ctx.paragraphAlign;
            }

            // if in list, should push to listitem.children, not elementNode.children
            if (ctx.findKeywordByType('listitem')) {
              const lastChild =
                elementNode.children[elementNode.children.length - 1];
              (lastChild as SerializedElementNode).children.push(child);
            } else {
              elementNode.children.push(child);
            }
          }
        }
        (elementNode as SerializedElementNode).direction =
          elementNode.children.length > 0 ? 'ltr' : null;
      }
      root.children.push(elementNode);
    }
    return { obj: { root } };
  }

  private convertBlockToLexical(
    block: KiwimeriParserBlock
  ): SerializedLexicalNode | SerializedElementNode {
    const node: SerializedLexicalNode = {
      type: block.type,
      version: 1
    };
    let elementNode = node as SerializedElementNode;
    switch (block.type) {
      case 'heading':
        elementNode = this.defaultElementNode(node);
        (elementNode as any).tag = block.tag;
        return elementNode;
      case 'list':
        return this.defaultElementNode(node);
      case 'quote':
        return this.defaultElementNode(node);
      case 'paragraph':
        elementNode = this.defaultElementNode(node);
        elementNode.textFormat = 0;
        elementNode.textStyle = '';
        return elementNode;
      case 'horizontalrule':
        return node;
    }
  }

  private convertTextToLexical(
    parsedText: KiwimeriParserText
  ): SerializedLexicalNode {
    const node: SerializedLexicalNode = {
      type: parsedText.type,
      version: 1
    };
    if (node.type === 'text' && parsedText.text) {
      (node as SerializedTextNode).text = parsedText.text;
      (node as SerializedTextNode).format = parsedText.format || 0;
    }
    if (node.type === 'text') {
      (node as SerializedTextNode).detail = 0;
      (node as SerializedTextNode).mode = 'normal';
      (node as SerializedTextNode).style = '';
    }
    return node;
  }

  private defaultElementNode(
    node: SerializedLexicalNode
  ): SerializedElementNode {
    return {
      ...node,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: []
    };
  }
}
