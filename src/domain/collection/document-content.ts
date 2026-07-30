import { SpaceDocContentTables } from '@/core/db/store-constants';
import { Id } from 'tinybase/with-schemas';

export type ContentRow = {
  content: string;
  plainText: string;
};

export type DerivedPreviewRow = {
  previewText: string;
};

export const contentSchema = {
  content: { type: 'string' },
  plainText: { type: 'string' }
} as const satisfies Record<keyof ContentRow, unknown>;

export const derivedPreviewSchema = {
  previewText: { type: 'string' }
} as const satisfies Record<keyof DerivedPreviewRow, unknown>;

export type DerivedPrefix = 'c' | 'a';
export function getDerivedId(on: DerivedPrefix, rowId: Id) {
  return `${on}-${rowId}`;
}
export function getDerivedTable(on: DerivedPrefix) {
  return on === 'c'
    ? SpaceDocContentTables.CollectionContent
    : SpaceDocContentTables.AnnotationContent;
}
