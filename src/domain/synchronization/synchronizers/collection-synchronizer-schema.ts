import { MinimizedDocAnnotation } from '@/domain/collection/compress-annotations';
import { MinimizedCollectionItem } from '@/domain/collection/compress-collection';
import { MinimizedUserPref } from '@/domain/user-preferences/compress-user-prefs';

export type RemoteCollectionFileContent = {
  i: MinimizedCollectionItem[]; // the items
  a?: MinimizedDocAnnotation[]; // the document annotations
  o?: MinimizedUserPref[]; // the user preferences / options
  u: number; // last content change
  _v?: number; // the schema version (!= app version)
  _av?: string; // the app version
};

export enum Versions {
  INITIAL = 1,
  WITH_SORT_LAST_ACTIVITY_AT = 2
}

export const REMOTE_COLLECTION_SCHEMA_VERSION =
  Versions.WITH_SORT_LAST_ACTIVITY_AT; // increment each breaking change

type MinSettings = { so?: { by: string } };

function migrateSortUpdatedAt(remoteContent: RemoteCollectionFileContent) {
  if (!remoteContent.i) return;
  remoteContent.i.forEach(minimizedItem => {
    if (
      minimizedItem.s &&
      (minimizedItem.s as MinSettings).so?.by === 'updatedAt'
    ) {
      (minimizedItem.s as MinSettings).so!.by = 'lastActivityAt';
    }
  });
}

export function applyRemoteSchemaMigration(
  remoteContent: RemoteCollectionFileContent
) {
  if (remoteContent._v === undefined) remoteContent._v = 0;

  if (remoteContent._v < Versions.WITH_SORT_LAST_ACTIVITY_AT) {
    migrateSortUpdatedAt(remoteContent);
  }
  if (
    remoteContent._v < Versions.INITIAL ||
    remoteContent._v > REMOTE_COLLECTION_SCHEMA_VERSION
  ) {
    throw new Error(
      `Version mismatch on remote collection filesystem: expected ${REMOTE_COLLECTION_SCHEMA_VERSION}, got ${remoteContent._v}`
    );
  }
}
