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

export type KiwimeriParserError = {
  line: number;
  blockPreview: string;
  lastKeyword: string | null;
  lastText: string | null;
};

export type KiwimeriParserResponse = {
  obj: SerializedEditorState | null;
  errors?: KiwimeriParserError[];
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
      const elementNode = this.convertBlockToLexical(block);
      if ('children' in elementNode) {
        while (lexer.nextText(block) !== null) {
          const lexerText = lexer.consumeText(block);
          if (lexerText === null) {
            const lines = ctx.blocks
              .map(block => block.text.replace(/[^\n]/g, '').length)
              .reduce((a, c) => a + c, 0);
            const errors: KiwimeriParserError[] = [
              {
                line: lines + 1,
                blockPreview: block.text,
                lastKeyword: ctx.lastKeyword?.token || null,
                lastText: ctx.lastText?.text || null
              }
            ];
            return { obj: null, errors };
          }
          ctx.nextText = lexer.nextText(block);
          const parsedText = this.parseText(
            lexerText!.token,
            lexerText!.type,
            ctx.copy(block),
            opts
          );

          if (parsedText === null) {
            continue;
          }

          // paragraph alignment propagation for next text
          if (parsedText.paragraphAlign !== undefined) {
            ctx.paragraphAlign = parsedText.paragraphAlign;
            if (parsedText.paragraphAlign !== '') {
              block.paragraphAlign = parsedText.paragraphAlign;
            }
          }

          if (lexerText?.type === 'keyword') {
            ctx.addKeyword(parsedText);
            if (parsedText.type === 'listitem') {
              const child: SerializedLexicalNode = this.convertTextToLexical(
                parsedText!,
                ctx
              );
              (child as SerializedElementNode).children = [];
              elementNode.children.push(child);
            }
          }

          if (lexerText?.type === 'text') {
            ctx.addText(parsedText);
            const child: SerializedLexicalNode = this.convertTextToLexical(
              parsedText!,
              ctx
            );
            if (ctx.paragraphAlign !== null) {
              elementNode.format = ctx.paragraphAlign;
            }

            // if in list, should push to listitem.children, not elementNode.children
            if (ctx.findKeywordByType('listitem')) {
              const lastChild =
                elementNode.children[elementNode.children.length - 1];
              (lastChild as SerializedElementNode).children.push(child);

              const propagateTextFormat = (
                (lastChild as SerializedElementNode)
                  .children[0] as SerializedTextNode
              ).format;
              if (propagateTextFormat !== 0) {
                (lastChild as SerializedElementNode).textFormat =
                  propagateTextFormat;
                elementNode.textFormat = propagateTextFormat;
              }
            } else {
              elementNode.children.push(child);
            }
          }
        }

        // propagate last block's align if current has no text (ex: empty <p>'s)
        if (
          elementNode.format === '' &&
          ctx.lastBlock?.type === 'paragraph' &&
          ctx.lastBlock?.paragraphAlign
        ) {
          elementNode.format = ctx.lastBlock.paragraphAlign;
        }

        // update element node direction :[
        // note: direction seems to be buggy on Lexical side
        (elementNode as SerializedElementNode).direction =
          elementNode.children.length > 0 ? 'ltr' : null;
        if (
          (elementNode.children.length === 0 &&
            ctx.lastBlock?.type !== 'paragraph') ||
          (ctx.lastBlock?.paragraphAlign !== undefined &&
            ctx.lastBlock.paragraphAlign !== '')
        ) {
          (elementNode as SerializedElementNode).direction = 'ltr';
        }
      }
      root.children.push(elementNode);
      ctx.addBlock(block);
    }

    // propagate textFormat to root if first child has a non zero value
    if (
      root.children.length > 0 &&
      'textFormat' in root.children[0] &&
      root.children[0].textFormat !== 0
    ) {
      (root as any).textFormat = root.children[0].textFormat;
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
        elementNode = this.defaultElementNode(node);
        (elementNode as any).start = 1;
        (elementNode as any).tag = block.tag;
        (elementNode as any).listType =
          block.tag === 'ul' ? 'bullet' : 'number';
        return elementNode;
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
    parsedText: KiwimeriParserText,
    ctx: KiwimeriParserContext
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
    if (node.type === 'listitem') {
      (node as SerializedElementNode).direction = 'ltr';
      (node as SerializedElementNode).format = '';
      (node as SerializedElementNode).indent = 0;
      (node as any).value = ctx.keywords.filter(
        kw => kw.type === 'listitem'
      ).length;
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
