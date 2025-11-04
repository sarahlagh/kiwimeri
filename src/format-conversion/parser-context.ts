import {
  ElementFormatType,
  SerializedElementNode,
  SerializedLexicalNode
} from 'lexical';
import { KiwimeriLexerResponse, KiwimeriLexicalElementParser } from './lexer';

type KiwimeriParserBlockType =
  | 'paragraph'
  | 'quote'
  | 'heading'
  | 'list'
  | 'horizontalrule';

export type KiwimeriParserBlock = {
  node: SerializedLexicalNode;
  text: string;
};

export type KiwimeriParserBlockOld = {
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
  elements: {
    lex: KiwimeriLexerResponse;
    node: SerializedLexicalNode | null;
  }[] = [];
  lastBlock: KiwimeriParserBlock | null = null;
  lastText: {
    lex: KiwimeriLexerResponse;
    node: SerializedLexicalNode | null;
  } | null = null;
  // texts: KiwimeriParserText[] = [];
  // keywords: KiwimeriParserText[] = [];
  lastKeyword: {
    lex: KiwimeriLexerResponse;
    node: SerializedLexicalNode | null;
  } | null = null;
  activeFormats: Set<number> = new Set();
  nextText: KiwimeriLexerResponse | null = null;
  paragraphAlign: ElementFormatType | null = null;
  capture: {
    node: SerializedElementNode;
    parser: KiwimeriLexicalElementParser;
  }[] = [];

  constructor(oth?: KiwimeriParserContext) {
    if (oth) {
      this.blocks = [...oth.blocks];
      this.lastBlock = oth.lastBlock;
      this.elements = [...oth.elements];
      // this.texts = [...oth.texts];
      this.lastText = oth.lastText;
      // this.keywords = [...oth.keywords];
      this.lastKeyword = oth.lastKeyword;
      this.activeFormats = oth.activeFormats;
      this.nextText = oth.nextText;
      this.paragraphAlign = oth.paragraphAlign;
      this.capture = [...oth.capture];
    }
  }

  addBlock(block: KiwimeriParserBlock) {
    this.blocks.push(block);
    this.lastBlock = this.blocks[this.blocks.length - 1];
  }

  addElement(lex: KiwimeriLexerResponse, node: SerializedLexicalNode | null) {
    this.elements.push({ lex, node });
    const keywords = this.elements.filter(el => el.lex.type === 'keyword');
    this.lastKeyword =
      keywords.length > 0 ? keywords[keywords.length - 1] : null;
    const nonKeywords = this.elements.filter(el => el.lex.type !== 'keyword');
    this.lastText =
      nonKeywords.length > 0 ? nonKeywords[nonKeywords.length - 1] : null;
  }

  // addText(text: KiwimeriParserText) {
  //   this.texts.push(text);
  //   this.lastText = this.texts[this.texts.length - 1];
  // }

  addKeyword(keyword: KiwimeriParserText) {
    // this.keywords.push(keyword);
    // this.lastKeyword = this.keywords[this.keywords.length - 1];
  }

  findKeywordByType(type: string) {
    // return this.keywords.find(k => k.type === type);
    return '';
  }

  addFormat(format: number) {
    this.activeFormats.add(format);
  }

  removeFormat(format: number) {
    this.activeFormats.delete(format);
  }

  mergeFormat(textFormat?: number) {
    if (textFormat) {
      if (this.activeFormats.has(textFormat)) {
        this.removeFormat(textFormat);
      } else {
        this.addFormat(textFormat);
      }
    }
  }

  getFormatUnion() {
    let format = 0;
    this.activeFormats.forEach(f => (format = format ^ f));
    return format;
  }

  getCapture() {
    return this.capture.length > 0
      ? this.capture[this.capture.length - 1]
      : undefined;
  }

  getParentCapture(currentBlock: KiwimeriParserBlock) {
    return (
      this.getCapture() || {
        node: currentBlock.node as SerializedElementNode,
        parser: null
      }
    );
  }

  propagateToParents(cb: (parentNode: SerializedElementNode) => void) {
    this.capture.forEach(parent => {
      cb(parent.node);
    });
  }

  captureEnds(lexResponse: KiwimeriLexerResponse) {
    return (
      this.getCapture() && this.getCapture()!.parser.captures!(lexResponse)
    );
  }

  addCapture(capture: {
    node: SerializedElementNode;
    parser: KiwimeriLexicalElementParser;
  }) {
    this.capture.push(capture);
  }

  removeCapture() {
    this.capture.pop();
  }

  resetBlock() {
    this.elements = [];
    // this.texts = [];
    this.lastText = null;
    // this.keywords = [];
    this.lastKeyword = null;
    this.activeFormats = new Set();
    this.paragraphAlign = null;
    this.capture = [];
  }

  copy(currentBlock?: KiwimeriParserBlock) {
    const newCtx = new KiwimeriParserContext(this);
    if (currentBlock) {
      newCtx.addBlock(currentBlock);
    }
    return newCtx;
  }
}
