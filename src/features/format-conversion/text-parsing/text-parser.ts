import {
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode
} from 'lexical';
import { KiwimeriParserContext } from './parser-context';
import { KiwimeriTextLexer } from './text-lexer';
import {
  KiwimeriLexerResponse,
  KiwimeriParserError,
  KiwimeriParserResponse,
  KiwimeriParserTextBlock,
  KiwimeriTextElementParser
} from './types';

// TODO add option to stick to classic markdown (no text align, <u>...)
// TODO add option about line endings
// TODO add option to care about textFormat propagation...

export abstract class KiwimeriTextParser {
  constructor() {}

  protected abstract getLexer(text: string, opts?: unknown): KiwimeriTextLexer;

  protected error(ctx: KiwimeriParserContext): KiwimeriParserError[] {
    const lines = ctx.blocks
      .map(block => block.text.replace(/[^\n]/g, '').length)
      .reduce((a, c) => a + c, 0);
    return [
      {
        line: lines,
        blockPreview: ctx.lastBlock!.text,
        lastKeyword: ctx.lastKeyword?.lex.token || null,
        lastText: ctx.lastText?.lex.token || null
      }
    ];
  }

  protected parseElem(
    elemParser: KiwimeriTextElementParser | null,
    lexResponse: KiwimeriLexerResponse,
    lexer: KiwimeriTextLexer,
    ctx: KiwimeriParserContext
  ) {
    const currentBlock = ctx.lastBlock!;
    ctx.mergeFormat(elemParser?.textFormat);

    let elemToken: string | null = lexResponse.token;
    if (ctx.blockParser?.transformChild) {
      elemToken = ctx.blockParser!.transformChild(
        lexResponse.token,
        ctx,
        currentBlock.blockData
      );
    }

    let newElem: SerializedLexicalNode | null = null;
    if (elemToken && elemParser?.parse) {
      newElem = elemParser?.parse(elemToken, ctx, lexer);

      // context 'captures' allows sub nodes to get the next tokens instead of the block node
      if (ctx.captureEnds(lexResponse)) {
        ctx.removeCapture();
      }
      const { node: parent } = ctx.getParentCapture(currentBlock);

      if (ctx.paragraphAlign !== null && ctx.paragraphAlign !== '') {
        parent.format = ctx.paragraphAlign;
      }

      if (newElem) {
        parent.children.push(newElem);
        if (elemParser?.captures && elemParser!.captures(lexResponse)) {
          ctx.addCapture({
            node: newElem as SerializedElementNode,
            parser: elemParser
          });
        }
      }
    }
    ctx.addElement(lexResponse, newElem);
  }

  protected handleBlock(
    lexer: KiwimeriTextLexer,
    block: KiwimeriParserTextBlock,
    ctx: KiwimeriParserContext
  ): { errors?: KiwimeriParserError[] } {
    ctx = ctx.copy(block);
    ctx.indexInBlock = 0;
    ctx.indexInLine = 0;
    while (lexer.nextText(block) !== null) {
      const lexResponse = lexer.consumeText(block);
      if (lexResponse === null) {
        return { errors: this.error(ctx) };
      }
      ctx.nextText = lexer.nextText(block);
      if (!lexResponse.elemParser) {
        return { errors: this.error(ctx) };
      }
      ctx.indexInBlock++;
      ctx.indexInLine++;
      if (lexResponse.token === '\n') {
        ctx.indexInLine = -1;
      }
      this.parseElem(lexResponse.elemParser, lexResponse, lexer, ctx);
    }
    return {};
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
        ctx.blockParser = blockParser;
        const block = blockParser.parse(token);
        if (!block) continue;
        if (this.isBlockElementNode(block.node)) {
          const { errors } = this.handleBlock(lexer, block, ctx);
          if (errors && errors.length > 0) {
            return { obj: null, errors };
          }
        }
        root.children.push(block.node);
        ctx.addBlock(block);
      }
    }
    this.propagateTextFormat(root);
    return { obj: { root } };
  }

  private propagateTextFormat(root: SerializedRootNode) {
    // propagate textFormat to root if first child has a non zero value
    if (
      root.children.length > 0 &&
      'textFormat' in root.children[0] &&
      root.children[0].textFormat !== 0
    ) {
      (root as SerializedElementNode).textFormat = root.children[0]
        .textFormat as number;
    }
  }

  protected isBlockElementNode(
    node?: SerializedLexicalNode | null
  ): node is SerializedElementNode {
    return (node && 'children' in node) || false;
  }
}
