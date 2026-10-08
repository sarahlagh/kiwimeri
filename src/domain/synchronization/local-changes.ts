import { SpaceTableId } from '@/core/db/store-schema';
import { AsId, DbSerializableData } from '@/core/db/types';
import { CellSchema } from 'tinybase/with-schemas';

export enum LocalChangeType {
  add = 'a',
  update = 'u',
  delete = 'd'
}
const changeTypeValues = ['a', 'u', 'd'] as const;
export type LocalChangeTypeValues = typeof LocalChangeType;
export type LocalChangeOn = SpaceTableId;

export interface LocalChangeRow<T> {
  itemId: string;
  createdAt: number;
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: AsId<T>;
  previousData?: { _v: DbSerializableData };
  previousHash?: number;
}

export const localChangesSchema = {
  itemId: { type: 'string' },
  createdAt: { type: 'number' },
  change: { enum: changeTypeValues },
  on: { type: 'string' }, // TODO enum
  field: { type: 'string' },
  previousData: { type: 'object' },
  previousHash: { type: 'number' }
} as const satisfies Record<keyof LocalChangeRow<unknown>, CellSchema>;

export type LocalChangeResult = {
  id: string;
  on: LocalChangeOn;
  itemId: string;
  createdAt: number;
  change: LocalChangeType;
  field?: string;
  previousHash?: number;
};
