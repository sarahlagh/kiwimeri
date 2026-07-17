export type DocumentStatRow = {
  itemId: string;
  date?: string;
  contentStatsJson?: DocumentContentStatsBag;
};

export const statsSchema = {
  itemId: { type: 'string' },
  date: { type: 'string' },
  contentStatsJson: { type: 'object' }
} as const satisfies Record<keyof DocumentStatRow, unknown>;

export type DocumentContentStatsBag = {
  lastWordCount?: number;
  maxWordCount?: number;
  lastCharCount?: number;
  maxCharCount?: number;
  updatedAt?: number;
};

export type DocumentDatedStat = DocumentStatRow & {
  date: string;
  contentStatsJson: DocumentContentStatsBag;
};

export type DocumentAllStats = {
  [key: string]: DocumentContentStatsBag;
};

export type DataPoint = {
  date: string; // 2026-06-01
  values: {
    [key: string]: number;
  };
};
