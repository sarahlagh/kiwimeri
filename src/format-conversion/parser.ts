/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode,
  SerializedTextNode
} from 'lexical';
import {
  KiwimeriLexer,
  KiwimeriLexerResponse,
  KiwimeriLexerResponseType,
  KiwimeriLexicalElementParser
} from './lexer';
import {
  KiwimeriParserBlock,
  KiwimeriParserBlockOld,
  KiwimeriParserContext,
  KiwimeriParserText
} from './parser-context';
import { ALL_ELEMENTS } from './parsers/markdown-elements';

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
    type: KiwimeriLexerResponseType,
    ctx: KiwimeriParserContext,
    opts?: unknown
  ): KiwimeriParserText | null;

  protected abstract parseBlock(
    token: string,
    ctx: KiwimeriParserContext,
    opts?: unknown
  ): KiwimeriParserBlockOld;

  private error(ctx: KiwimeriParserContext) {
    const lines = ctx.blocks
      .map(block => block.text.replace(/[^\n]/g, '').length)
      .reduce((a, c) => a + c, 0);
    return {
      obj: null,
      errors: [
        {
          line: lines + 1, // TODO check
          blockPreview: ctx.lastBlock!.text,
          lastKeyword: ctx.lastKeyword?.token || null,
          lastText: ctx.lastText?.lex.token || null
        }
      ]
    };
  }

  private parseElem(
    elemParser: KiwimeriLexicalElementParser | null,
    lexResponse: KiwimeriLexerResponse,
    lexer: KiwimeriLexer,
    ctx: KiwimeriParserContext
  ) {
    const currentBlock = ctx.lastBlock!;
    if (elemParser?.textFormat) {
      if (ctx.activeFormats.has(elemParser.textFormat)) {
        ctx.removeFormat(elemParser.textFormat);
      } else {
        ctx.addFormat(elemParser.textFormat);
      }
    }
    let newElem: SerializedLexicalNode | null = null;
    if (elemParser?.parse) {
      newElem = elemParser?.parse(lexResponse.token, ctx, lexer);
      if (!newElem) return;

      // context 'captures' allows sub nodes to get the next tokens instead of the block node
      if (ctx.captureEnds(lexResponse)) {
        ctx.removeCapture();
      }
      const parent = ctx.getParentNode(currentBlock);
      parent.children.push(newElem);
      if (elemParser?.captures && elemParser!.captures(lexResponse)) {
        ctx.addCapture({
          node: newElem as SerializedElementNode,
          parser: elemParser
        });
      }
    }
    ctx.addElement(lexResponse, newElem);
  }

  private handleBlock(
    lexer: KiwimeriLexer,
    block: KiwimeriParserBlock,
    ctx: KiwimeriParserContext
  ) {
    ctx = ctx.copy(block);
    while (lexer.nextText(block) !== null) {
      const lexResponse = lexer.consumeText(block);
      if (lexResponse === null) {
        return this.error(ctx);
      }
      ctx.nextText = lexer.nextText(block);
      if (lexResponse.elemParser) {
        this.parseElem(lexResponse.elemParser, lexResponse, lexer, ctx);
      } else {
        // shouldn't happen? fallback is PLAIN_TEXT
        for (const elemParser of ALL_ELEMENTS) {
          if (elemParser.type !== lexResponse.type) continue;
          if (elemParser.matches && !elemParser.matches(lexResponse.token))
            continue;
          this.parseElem(elemParser, lexResponse, lexer, ctx);
          continue;
        }
        // this.parseElem(null, lexResponse, lexer, ctx.copy(block));
      }
    }
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
    const ctx = new KiwimeriParserContext();
    const lexer = this.getLexer(text, opts);

    while (lexer.nextBlock() !== null) {
      const { token, blockParser } = lexer.consumeBlock()!;
      ctx.resetBlock();

      if (blockParser) {
        const block = blockParser.parse(token);
        if (!block) continue;
        if (this.isBlockElementNode(block.node)) {
          this.handleBlock(lexer, block, ctx);
        }
        root.children.push(block.node);
        ctx.addBlock(block);
      }
    }
    return { obj: { root } };
  }

  public parseOld(text: string, opts?: unknown): KiwimeriParserResponse {
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
            return {
              obj: null,
              errors: [
                {
                  line: lines + 1,
                  blockPreview: block.text,
                  lastKeyword: ctx.lastKeyword?.token || null,
                  lastText: ctx.lastText?.text || null
                }
              ]
            };
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

        // propagate last block's align if last block had no text (ex: empty <p>'s)
        let hadEmptyChildrenBefore = false;
        if (
          root.children.length > 0 &&
          'children' in root.children[root.children.length - 1]
        ) {
          hadEmptyChildrenBefore =
            (
              root.children[root.children.length - 1] as SerializedElementNode
            ).children
              .map(c => (c as any).text?.trim() || '')
              .filter(t => t.length > 0).length === 0;
        }

        const hasEmptyChildren =
          elementNode.children
            .map(c => (c as any).text?.trim() || '')
            .filter(t => t.length > 0).length === 0;
        if (
          elementNode.format === '' &&
          (hasEmptyChildren || hadEmptyChildrenBefore) &&
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
    block: KiwimeriParserBlockOld
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

  private isBlockElementNode(
    node?: SerializedLexicalNode | null
  ): node is SerializedElementNode {
    return (node && 'children' in node) || false;
  }
}
