import { SpaceTables } from '@/core/db/store-constants';
import { WithId } from '@/core/db/types';
import type { SerializedLexicalNode } from 'lexical';
import { CellSchema } from 'tinybase/with-schemas';

export type DocumentEditRow = {
  on: SpaceTables.Collection | SpaceTables.Annotations;
  itemId: string;
  createdAt: number;
  json: string;
  isFullSnapshot: boolean;
  debugPayload?: string;
};

export const documentEditsSchema = {
  on: { type: 'string' }, // TODO enum
  itemId: { type: 'string' },
  createdAt: { type: 'number' },
  json: { type: 'string' },
  isFullSnapshot: { type: 'boolean' },
  debugPayload: { type: 'string' }
} as const satisfies Record<keyof DocumentEditRow, CellSchema>;

export type DocumentEdit = WithId<DocumentEditRow>;

export type LexicalDiff = {
  idx: number;
  block: SerializedLexicalNode;
};
