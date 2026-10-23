import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import type { KiwimeriParserContext } from './parser-context';
import type { KiwimeriTextLexer } from './text-lexer';

export type KiwimeriParserTextBlock = {
  node: SerializedLexicalNode;
  text: string;
  blockData?: unknown;
};

export type KiwimeriTextBlockParser<O> = {
  name?: string;
  tokenize: (nextBlock: string) => string | null;
  parse: (token: string) => KiwimeriParserTextBlock | null;
  transformChild?: (
    text: string,
    ctx: KiwimeriParserContext<O>,
    blockData: unknown
  ) => string | null;
};

export type KiwimeriTextElementParser<O> = {
  name?: string;
  type: KiwimeriLexerResponseType;
  tokenize: (
    nextText: string,
    block: KiwimeriParserTextBlock,
    isStartOfLine: boolean,
    opts?: O
  ) => string | null;
  matches?: (nextText: string) => boolean;
  textFormat?: number;
  parse?: (
    token: string,
    ctx: KiwimeriParserContext<O>,
    lexer: KiwimeriTextLexer<O>
  ) => SerializedLexicalNode | null;
  captures?: (resp: KiwimeriLexerResponse<O>) => boolean;
};

export type KiwimeriLexerResponseType = 'text' | 'keyword';
export type KiwimeriLexerResponse<O> = {
  token: string;
  type: KiwimeriLexerResponseType;
  blockParser?: KiwimeriTextBlockParser<O>;
  elemParser?: KiwimeriTextElementParser<O>;
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
