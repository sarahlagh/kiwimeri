import { LocalChangeOn } from '../local-changes/model';

export type DerivedContentRow = {
  on: LocalChangeOn;
  plainText: string;
};

export const derivedContentSchema = {
  on: { type: 'string' },
  plainText: { type: 'string' }
} as const satisfies Record<keyof DerivedContentRow, unknown>;
