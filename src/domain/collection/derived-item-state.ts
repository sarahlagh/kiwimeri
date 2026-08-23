import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId } from '@/core/db/store-schema';

export type ProjectedItemStateRow = {
  shortPath: string[];
  fullPath: string[];
};
export const projectedItemStateSchema = {
  shortPath: { type: 'array' },
  fullPath: { type: 'array' }
} as const satisfies Record<keyof ProjectedItemStateRow, unknown>;

export type ItemViewRow = {
  lastOpenedAt: number;
  previewText?: string;
};
export const collectionItemViewSchema = {
  lastOpenedAt: { type: 'number' },
  previewText: { type: 'string' }
} as const satisfies Record<keyof ItemViewRow, unknown>;

export type AnnotViewRow = {
  previewText: string;
};
export const annotationsViewSchema = {
  previewText: { type: 'string' }
} as const satisfies Record<keyof AnnotViewRow, unknown>;

export function getViewTable(on: SpaceTableId) {
  if (on === SpaceTables.Collection) return SpaceTables.CollectionItemView;
  if (on === SpaceTables.Annotations) return SpaceTables.AnnotationView;
  return undefined;
}
