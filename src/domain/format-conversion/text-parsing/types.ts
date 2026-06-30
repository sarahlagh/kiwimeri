import { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import { KiwimeriParserContext } from './parser-context';
import { KiwimeriTextLexer } from './text-lexer';

export type KiwimeriParserTextBlock = {
  node: SerializedLexicalNode;
  text: string;
  blockData?: unknown;
};

export type KiwimeriTextBlockParser = {
  name?: string;
  tokenize: (nextBlock: string) => string | null;
  parse: (token: string) => KiwimeriParserTextBlock | null;
  transformChild?: (
    text: string,
    ctx: KiwimeriParserContext,
    blockData: unknown
  ) => string | null;
};

export type KiwimeriTextElementParser = {
  name?: string;
  type: KiwimeriLexerResponseType;
  tokenize: (
    nextText: string,
    block: KiwimeriParserTextBlock,
    isStartOfLine: boolean
  ) => string | null;
  matches?: (nextText: string) => boolean;
  textFormat?: number;
  parse?: (
    token: string,
    ctx: KiwimeriParserContext,
    lexer: KiwimeriTextLexer
  ) => SerializedLexicalNode | null;
  captures?: (resp: KiwimeriLexerResponse) => boolean;
};

export type KiwimeriLexerResponseType = 'text' | 'keyword';
export type KiwimeriLexerResponse = {
  token: string;
  type: KiwimeriLexerResponseType;
  blockParser?: KiwimeriTextBlockParser;
  elemParser?: KiwimeriTextElementParser;
};

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
