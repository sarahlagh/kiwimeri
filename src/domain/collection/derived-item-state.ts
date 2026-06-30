export type DerivedItemStateRow = {
  shortPath: string[];
  fullPath: string[];
};

export const derivedItemStateSchema = {
  shortPath: { type: 'array' },
  fullPath: { type: 'array' }
} as const satisfies Record<keyof DerivedItemStateRow, unknown>;
