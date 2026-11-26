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
  on: { type: 'string', required: true }, // TODO enum
  itemId: { type: 'string', required: true },
  createdAt: { type: 'number', required: true },
  json: { type: 'string', required: true },
  isFullSnapshot: { type: 'boolean', default: false },
  debugPayload: { type: 'string' }
} as const satisfies Record<keyof DocumentEditRow, CellSchema>;

export type DocumentEdit = WithId<DocumentEditRow>;

export type LexicalDiff = {
  idx: number;
  block: SerializedLexicalNode;
};
