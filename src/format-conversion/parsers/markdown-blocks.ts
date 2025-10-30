const endOfBlock = (nextBlock: string, strictParagraph = false) => {
  if (strictParagraph) {
    const endOfBlock = nextBlock.indexOf('\n\n');
    if (endOfBlock < 0) {
      return nextBlock;
    }
    return nextBlock.substring(0, endOfBlock + 2);
  } else {
    const endOfBlock = nextBlock.indexOf('\n');
    if (endOfBlock < 0) {
      return nextBlock;
    }
    if (nextBlock[endOfBlock + 1] === '\n') {
      return nextBlock.substring(0, endOfBlock + 2);
    }
    return nextBlock.substring(0, endOfBlock + 1);
  }
};

type KiwimeriLexicalBlock = {
  tokenize: (nextBlock: string) => string | null;
};

const HEADING: KiwimeriLexicalBlock = {
  tokenize: nextBlock =>
    nextBlock.match(/^(#+)/g) ? endOfBlock(nextBlock) : null
};

const QUOTE: KiwimeriLexicalBlock = {
  tokenize: nextBlock =>
    nextBlock.startsWith('>') ? endOfBlock(nextBlock) : null
};

const HRULE: KiwimeriLexicalBlock = {
  tokenize: nextBlock =>
    nextBlock.startsWith('---') ? endOfBlock(nextBlock) : null
};

const LIST: KiwimeriLexicalBlock = {
  tokenize: nextBlock =>
    nextBlock.startsWith('- ') || nextBlock.match(/^\d+\. /g)
      ? endOfBlock(nextBlock, true)
      : null
};

const EMPTY_PARAGRAPH: KiwimeriLexicalBlock = {
  tokenize: nextBlock => {
    if (nextBlock.match(/^\n+/g)) return '\n';
    if (nextBlock.match(/^<p [^>]*><\/p>\n+/g)) return endOfBlock(nextBlock);
    // try catching <p ...>\n</p>\n
    const pEl = nextBlock.match(/^<p [^>]*>(.*)\n+<\/p>\n+/g);
    if (pEl) {
      return pEl[0];
    }
    return null;
  }
};

export const ALL_BLOCKS: KiwimeriLexicalBlock[] = [
  HEADING,
  QUOTE,
  HRULE,
  LIST,
  EMPTY_PARAGRAPH
];
