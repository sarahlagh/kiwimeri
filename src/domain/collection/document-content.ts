import { SpaceDocContentTables, SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId } from '@/core/db/store-schema';
import { MetaField } from '@/core/db/types';

export type ContentRow = {
  content: string;
  content_meta: MetaField;
  plainText: string;
};

export type ContentAddition = Pick<ContentRow, 'content' | 'content_meta'>;

export const contentSchema = {
  content: { type: 'string' },
  content_meta: { type: 'object' },
  plainText: { type: 'string' }
} as const satisfies Record<keyof ContentRow, unknown>;

export function getContentTable(on: SpaceTableId) {
  if (on === SpaceTables.Collection)
    return SpaceDocContentTables.CollectionContent;
  if (on === SpaceTables.Annotations)
    return SpaceDocContentTables.AnnotationContent;
  return undefined;
}
