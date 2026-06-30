// TODO not a good name, and not a good place for it...
export type DocumentGlobalStatsBag = {
  lastOpenedAt: number;
};

export type DocumentStatRow = {
  itemId: string;
  date?: string;
  contentStatsJson?: DocumentContentStatsBag;
} & Partial<DocumentGlobalStatsBag>;

export const statsSchema = {
  itemId: { type: 'string' },
  date: { type: 'string' },
  contentStatsJson: { type: 'object' },
  lastOpenedAt: { type: 'number' }
} as const satisfies Record<keyof DocumentStatRow, unknown>;

export type DocumentContentStatsBag = {
  lastWordCount?: number;
  maxWordCount?: number;
  lastCharCount?: number;
  maxCharCount?: number;
  updatedAt?: number;
};

export type DocumentDatedStat = Omit<DocumentStatRow, 'id'> & {
  date: string;
  contentStats: DocumentContentStatsBag;
};

export type DocumentAllStats = {
  [key: string]: DocumentContentStatsBag;
} & DocumentGlobalStatsBag;

export type DataPoint = {
  date: string; // 2026-06-01
  values: {
    [key: string]: number;
  };
};
