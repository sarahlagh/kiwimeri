import {
  ElementFormatType,
  SerializedEditorState,
  SerializedElementNode,
  SerializedLexicalNode,
  SerializedRootNode,
  SerializedTextNode
} from 'lexical';
import { KiwimeriLexer, KiwimeriLexerResponse } from './lexer';

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
  paragraphFormat?: string;
};

export class KiwimeriParserContext {
  blocks: KiwimeriParserBlock[] = [];
  lastBlock: KiwimeriParserBlock | null = null;
  texts: KiwimeriParserText[] = [];
  lastText: KiwimeriParserText | null = null;
  keywords: KiwimeriParserText[] = [];
  lastKeyword: KiwimeriParserText | null = null;
  activeFormats: Set<number> = new Set();
  nextText: KiwimeriLexerResponse | null = null;

  constructor(oth?: KiwimeriParserContext) {
    if (oth) {
      this.blocks = [...oth.blocks];
      this.lastBlock = oth.lastBlock;
      this.texts = [...oth.texts];
      this.lastText = oth.lastText;
      this.keywords = [...oth.keywords];
      this.lastKeyword = oth.lastKeyword;
      this.activeFormats = oth.activeFormats;
      this.nextText = oth.nextText;
    }
  }

  addBlock(block: KiwimeriParserBlock) {
    this.blocks.push(block);
    this.lastBlock = this.blocks[this.blocks.length - 1];
  }

  addText(text: KiwimeriParserText) {
    this.texts.push(text);
    this.lastText = this.texts[this.texts.length - 1];
  }

  addKeyword(keyword: KiwimeriParserText) {
    this.keywords.push(keyword);
    this.lastKeyword = this.keywords[this.keywords.length - 1];
  }

  findKeywordByType(type: string) {
    return this.keywords.find(k => k.type === type);
  }

  addFormat(format: number) {
    this.activeFormats.add(format);
  }

  removeFormat(format: number) {
    this.activeFormats.delete(format);
  }

  getFormatUnion() {
    let format = 0;
    this.activeFormats.forEach(f => (format = format ^ f));
    return format;
  }

  resetTextsKeywords() {
    this.texts = [];
    this.lastText = null;
    this.keywords = [];
    this.lastKeyword = null;
    this.activeFormats = new Set();
  }

  copy() {
    return new KiwimeriParserContext(this);
  }
}

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
      ctx.resetTextsKeywords();
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

          if (lexerText?.type === 'keyword') {
            // TODO if linebreak, remove all keywords?
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
              parsedText!,
              block
            );
            if (block.paragraphAlign) {
              elementNode.format = block.paragraphAlign;
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

  private convertTextToLexical(
    parsedText: KiwimeriParserText,
    block?: KiwimeriParserBlock
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
    if (block && parsedText.paragraphFormat) {
      (block as KiwimeriParserBlock).paragraphAlign =
        parsedText.paragraphFormat as ElementFormatType; // TODO handle error
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
      children: [],
      textFormat: 0,
      textStyle: ''
    };
  }
}
