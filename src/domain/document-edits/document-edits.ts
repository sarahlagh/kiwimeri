import { SpaceTables } from '@/core/db/store-constants';
import { WithId } from '@/core/db/types';
import type { SerializedLexicalNode } from 'lexical';

export type DocumentEditRow = {
  on: SpaceTables.Collection | SpaceTables.Annotations;
  itemId: string;
  createdAt: number;
  json: string;
  isFullSnapshot: boolean;
};

export const documentEditsSchema = {
  on: { type: 'string' },
  itemId: { type: 'string' },
  createdAt: { type: 'number' },
  json: { type: 'string' },
  isFullSnapshot: { type: 'boolean' }
} as const satisfies Record<keyof DocumentEditRow, unknown>;

export type DocumentEdit = WithId<DocumentEditRow>;

export type LexicalDiff = {
  idx: number;
  block: SerializedLexicalNode;
};
