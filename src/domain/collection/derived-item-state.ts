import { SpaceTables } from '@/core/db/store-constants';
import { SpaceTableId } from '@/core/db/store-schema';
import { CellSchema } from 'tinybase/with-schemas';

export type LastActivityAt = {
  lastActivityAt: number;
};

export type ProjectedItemStateRow = LastActivityAt & {
  shortPath: string[];
  fullPath: string[];
};
export const projectedItemStateSchema = {
  fullPath: { type: 'array', required: true },
  shortPath: { type: 'array' },
  lastActivityAt: { type: 'number', required: true }
} as const satisfies Record<keyof ProjectedItemStateRow, CellSchema>;

export type ItemViewRow = {
  lastOpenedAt: number;
  previewText?: string;
};
export const collectionItemViewSchema = {
  lastOpenedAt: { type: 'number' },
  previewText: { type: 'string' }
} as const satisfies Record<keyof ItemViewRow, CellSchema>;

export type AnnotViewRow = {
  previewText: string;
};
export const annotationsViewSchema = {
  previewText: { type: 'string' }
} as const satisfies Record<keyof AnnotViewRow, CellSchema>;

export function getViewTable(on: SpaceTableId) {
  if (on === SpaceTables.Collection) return SpaceTables.CollectionItemView;
  if (on === SpaceTables.Annotations) return SpaceTables.AnnotationView;
  return undefined;
}
