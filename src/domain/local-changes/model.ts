import { SpaceTablesType } from '@/core/db/store-schema';
import { AsId, TableIdFromSchema } from '@/core/db/types';

export enum LocalChangeType {
  add = 'a',
  update = 'u',
  delete = 'd'
}

export type LocalChangeTypeValues = 'a' | 'u' | 'd';
export type LocalChangeOn = TableIdFromSchema<SpaceTablesType> | 'values';

export interface LocalChangeRow<T> {
  itemId: string;
  createdAt: number;
  change: LocalChangeType;
  on: LocalChangeOn;
  field?: AsId<T>;
}

export const localChangesSchema = {
  itemId: { type: 'string' },
  createdAt: { type: 'number' },
  change: { type: 'string' },
  on: { type: 'string' },
  field: { type: 'string' }
} as const satisfies Record<keyof LocalChangeRow<unknown>, unknown>;

export type LocalChangeResult = {
  id: string;
  on: LocalChangeOn;
  itemId: string;
  createdAt: number;
  change: LocalChangeType;
  field?: string;
};
