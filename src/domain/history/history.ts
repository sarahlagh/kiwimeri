import { CollectionItemSnapshotData } from '../collection/collection';

export type CollectionItemVersionOp = 'snapshot' | 'deleted';

export type CollectionItemVersionRow = {
  itemId: string;
  op: CollectionItemVersionOp;
  createdAt: number;
  contentId: string;
  snapshotJson: Partial<CollectionItemSnapshotData>;
};
export type CollectionItemVersionContentRow = {
  content: string;
  plainText: string;
};

export const historySchema = {
  itemId: { type: 'string' },
  op: { type: 'string' },
  createdAt: { type: 'number' },
  snapshotJson: { type: 'object' },
  contentId: { type: 'string' }
} as const satisfies Record<keyof CollectionItemVersionRow, unknown>;

export const historyContentSchema = {
  content: { type: 'string' },
  plainText: { type: 'string' }
} as const satisfies Record<keyof CollectionItemVersionContentRow, unknown>;
