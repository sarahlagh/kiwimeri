import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import type { KiwimeriParserContext } from './parser-context';
import type { KiwimeriTextLexer } from './text-lexer';

export type KiwimeriParserTextBlock = {
  node: SerializedLexicalNode;
  text: string;
  blockData?: unknown;
};

export type KiwimeriTextBlockParserBase<T> = {
  name?: string;
  parse: (token: T) => KiwimeriParserTextBlock | null;
};

export type KiwimeriTextBlockParser<O> = KiwimeriTextBlockParserBase<string> & {
  name?: string;
  tokenize: (nextBlock: string) => string | null;
  parse: (token: string) => KiwimeriParserTextBlock | null;
  /* happens after block parse and before element tokenize */
  preTokenizeChild?: (
    block: KiwimeriParserTextBlock,
    ctx: KiwimeriParserContext<O>
  ) => void;
  /* happens after block parse and before element tokenize */
  postTokenizeChild?: (
    text: string,
    ctx: KiwimeriParserContext<O>,
    blockData: unknown
  ) => string | null;
};

export type KiwimeriTextElementParserBase<T, O> = {
  name?: string;
  parse?: (
    token: T,
    ctx: KiwimeriParserContext<O>
  ) => SerializedLexicalNode | null;
  hasSiblings?: (token: T) => boolean;
  postParse?: (ctx: KiwimeriParserContext<O>) => void;
  captures?: () => boolean;
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
  line?: number;
  blockPreview?: string;
  lastKeyword?: string | null;
  lastText?: string | null;
  message?: string;
};

export type KiwimeriParserResponse = {
  obj: SerializedEditorState | null;
  errors?: KiwimeriParserError[];
};
