import { ElementFormatType } from 'lexical';
import { KiwimeriLexerResponse } from './lexer';

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
  tag?: string;
};

export type KiwimeriParserText = {
  text?: string;
  token: string;
  type: 'text' | 'linebreak' | 'listitem';
  format?: number;
  paragraphAlign?: ElementFormatType;
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
  paragraphAlign: ElementFormatType | null = null;

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
      this.paragraphAlign = oth.paragraphAlign;
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

  resetBlock() {
    this.texts = [];
    this.lastText = null;
    this.keywords = [];
    this.lastKeyword = null;
    this.activeFormats = new Set();
    this.paragraphAlign = null;
  }

  copy(currentBlock?: KiwimeriParserBlock) {
    const newCtx = new KiwimeriParserContext(this);
    if (currentBlock) {
      newCtx.addBlock(currentBlock);
    }
    return newCtx;
  }
}
