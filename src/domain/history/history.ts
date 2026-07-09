import { WithId } from '@/core/db/types';
import { Id } from 'tinybase/with-schemas';
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
};

export const historySchema = {
  itemId: { type: 'string' },
  op: { type: 'string' },
  createdAt: { type: 'number' },
  snapshotJson: { type: 'object' },
  contentId: { type: 'string' }
} as const satisfies Record<keyof CollectionItemVersionRow, unknown>;

export const historyContentSchema = {
  content: { type: 'string' }
} as const satisfies Record<keyof CollectionItemVersionContentRow, unknown>;

export type CollectionItemVersion = CollectionItemMetadataVersion &
  CollectionItemVersionContentRow;

export type CollectionItemMetadataVersion = WithId<{
  id: Id;
  op: CollectionItemVersionOp;
  itemId: string;
  createdAt: number;
  snapshotJson: CollectionItemSnapshotData;
  hash: Id;
}>;
