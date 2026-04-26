export type DocumentGlobalStatsBag = {
  lastOpenedAt: number;
};

export type DocumentStatRow = {
  id?: string;
  itemId: string;
  date?: string;
  contentStatsJson?: string;
} & Partial<DocumentGlobalStatsBag>;

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
