import { MetaField } from '@/core/db/types';
import { Id } from 'tinybase/with-schemas';

export type ContentRow = {
  content: string;
  content_meta: MetaField;
};

export type DerivedContentRow = {
  plainText: string;
};

export type DerivedPreviewRow = {
  previewText: string;
};

export const contentSchema = {
  content: { type: 'string' },
  content_meta: { type: 'object' }
} as const satisfies Record<keyof ContentRow, unknown>;

export const derivedPreviewSchema = {
  previewText: { type: 'string' }
} as const satisfies Record<keyof DerivedPreviewRow, unknown>;

export const derivedContentSchema = {
  plainText: { type: 'string' }
} as const satisfies Record<keyof DerivedContentRow, unknown>;

export type DerivedPrefix = 'c' | 'a';
export function getDerivedId(on: DerivedPrefix, rowId: Id) {
  return `${on}-${rowId}`;
}
