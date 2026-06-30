import {
  ElementFormatType,
  SerializedElementNode,
  SerializedLexicalNode
} from 'lexical';

import {
  KiwimeriLexerResponse,
  KiwimeriParserTextBlock,
  KiwimeriTextBlockParser,
  KiwimeriTextElementParser
} from './types';

export class KiwimeriParserContext {
  blockParser: KiwimeriTextBlockParser | null = null;
  blocks: KiwimeriParserTextBlock[] = []; // currently only used for getting line in error
  elements: {
    lex: KiwimeriLexerResponse;
    node: SerializedLexicalNode | null;
  }[] = [];
  lastBlock: KiwimeriParserTextBlock | null = null;
  lastText: {
    lex: KiwimeriLexerResponse;
    node: SerializedLexicalNode | null;
  } | null = null;
  lastKeyword: {
    lex: KiwimeriLexerResponse;
    node: SerializedLexicalNode | null;
  } | null = null;
  activeFormats: Set<number> = new Set();
  nextText: KiwimeriLexerResponse | null = null;
  paragraphAlign: ElementFormatType | null = null;
  capture: {
    node: SerializedElementNode;
    parser: KiwimeriTextElementParser;
  }[] = [];

  indexInBlock: number = 0;
  indexInLine: number = 0;

  constructor(oth?: KiwimeriParserContext) {
    if (oth) {
      this.blockParser = oth.blockParser;
      this.blocks = [...oth.blocks];
      this.lastBlock = oth.lastBlock;
      this.elements = [...oth.elements];
      this.lastText = oth.lastText;
      this.lastKeyword = oth.lastKeyword;
      this.activeFormats = oth.activeFormats;
      this.nextText = oth.nextText;
      this.paragraphAlign = oth.paragraphAlign;
      this.capture = [...oth.capture];
      this.indexInBlock = oth.indexInBlock;
      this.indexInLine = oth.indexInLine;
    }
  }

  addBlock(block: KiwimeriParserTextBlock) {
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

  getParentCapture(currentBlock: KiwimeriParserTextBlock) {
    return (
      this.getCapture() || {
        node: currentBlock.node as SerializedElementNode,
        parser: null
      }
    );
  }

  captureEnds(lexResponse: KiwimeriLexerResponse) {
    return (
      this.getCapture() && this.getCapture()!.parser.captures!(lexResponse)
    );
  }

  addCapture(capture: {
    node: SerializedElementNode;
    parser: KiwimeriTextElementParser;
  }) {
    this.capture.push(capture);
  }

  removeCapture() {
    this.capture.pop();
  }

  resetBlock() {
    this.blockParser = null;
    this.elements = [];
    this.lastText = null;
    this.lastKeyword = null;
    this.activeFormats = new Set();
    this.paragraphAlign = null;
    this.capture = [];
    this.indexInBlock = 0;
    this.indexInLine = 0;
  }

  copy(currentBlock?: KiwimeriParserTextBlock) {
    const newCtx = new KiwimeriParserContext(this);
    if (currentBlock) {
      newCtx.addBlock(currentBlock);
    }
    return newCtx;
  }
}
