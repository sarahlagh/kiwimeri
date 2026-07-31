import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId } from '@/core/db/store-schema';
import { MetaField } from '@/core/db/types';
import { Id } from 'tinybase/with-schemas';

export type ContentRow = {
  content: string;
  content_meta?: MetaField;
  plainText: string;
};

export type ContentAddition = Pick<ContentRow, 'content' | 'content_meta'>;

export type DerivedPreviewRow = {
  previewText: string;
};

export const contentSchema = {
  content: { type: 'string' },
  content_meta: { type: 'object' },
  plainText: { type: 'string' }
} as const satisfies Record<keyof ContentRow, unknown>;

export const derivedPreviewSchema = {
  previewText: { type: 'string' }
} as const satisfies Record<keyof DerivedPreviewRow, unknown>;

export type DerivedPrefix = 'c' | 'a';
export function getDerivedId(on: DerivedPrefix, rowId: Id) {
  return `${on}-${rowId}`;
}
export function getDerivedTable(on: DerivedPrefix | SpaceTableId) {
  if (on === 'c' || on === SpaceTables.Collection)
    return SpaceDocContentTables.CollectionContent;
  if (on === 'a' || on === SpaceTables.Annotations)
    return SpaceDocContentTables.AnnotationContent;
  return undefined;
}
