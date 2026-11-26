import { WithId } from '@/core/db/types';
import { CellSchema, Id } from 'tinybase/with-schemas';
import { CollectionItemSnapshotData } from '../collection/collection';

const opValues = ['snapshot', 'deleted'] as const;
export type CollectionItemVersionOp = (typeof opValues)[number];

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
  itemId: { type: 'string', required: true },
  op: { enum: opValues, required: true },
  createdAt: { type: 'number', required: true },
  snapshotJson: { type: 'object', required: true },
  contentId: { type: 'string', required: true }
} as const satisfies Record<keyof CollectionItemVersionRow, CellSchema>;

export const historyContentSchema = {
  content: { type: 'string', required: true }
} as const satisfies Record<keyof CollectionItemVersionContentRow, CellSchema>;

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
