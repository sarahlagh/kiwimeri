import { CollectionItemSnapshotData } from '../collection/model';

export type CollectionItemVersionOp = 'snapshot' | 'deleted';

export type CollectionItemVersionRow = {
  itemId: string;
  op: CollectionItemVersionOp;
  createdAt: number;
  rank: number; // not ideal when created informs the order, but convenient for the gc query
  contentId: string;
  snapshotJson: Partial<CollectionItemSnapshotData>;
};
export type CollectionItemVersionContentRow = {
  content: string;
  preview: string;
  hash: number;
};

export const historySchema = {
  itemId: { type: 'string' },
  op: { type: 'string' },
  createdAt: { type: 'number' },
  rank: { type: 'number' },
  snapshotJson: { type: 'object' },
  contentId: { type: 'string' }
} as const satisfies Record<keyof CollectionItemVersionRow, unknown>;

export const historyContentSchema = {
  content: { type: 'string' },
  preview: { type: 'string' },
  hash: { type: 'number' }
} as const satisfies Record<keyof CollectionItemVersionContentRow, unknown>;
