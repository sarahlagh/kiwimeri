export type DerivedItemStateRow = {
  shortPath: string[];
  fullPath: string[];
  updatedAtRank: number;
  lastOpenedAtRank: number;
};

export const derivedItemStateSchema = {
  shortPath: { type: 'array' },
  fullPath: { type: 'array' },
  updatedAtRank: { type: 'number' },
  lastOpenedAtRank: { type: 'number' }
} as const satisfies Record<keyof DerivedItemStateRow, unknown>;
