import { Id } from 'tinybase/with-schemas';

export type DerivedContentRow = {
  plainText: string;
};

export const derivedContentSchema = {
  plainText: { type: 'string' }
} as const satisfies Record<keyof DerivedContentRow, unknown>;

export type DerivedPrefix = 'c' | 'a';
export function getDerivedId(on: DerivedPrefix, rowId: Id) {
  return `${on}-${rowId}`;
}
