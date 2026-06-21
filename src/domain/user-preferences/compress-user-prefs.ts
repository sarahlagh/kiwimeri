import { minimizeKeys, unminimizeKeys } from '@/common/utils';
import { AnyData, SerializableData } from '@/core/db/types';
import { SyncableUserPref, UserPreferenceRow } from './model';

const keys = [
  ['id', 'i'],
  ['value', 'v'],
  ['updatedAt', 'u']
];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIN_KEYS = ['i', 'v', 'u'] as const;
export type MinKeys = typeof MIN_KEYS;

export type MinimizedUserPref = {
  [key in MinKeys[number]]: SerializableData | undefined;
};

const keysMap = new Map();
const keysMapReverse = new Map();
keys.forEach(([v1, v2]) => {
  keysMap.set(v1, v2);
  keysMapReverse.set(v2, v1);
});

export const minimizePrefsForStorage = (obj: UserPreferenceRow[]) => {
  return obj.map(
    item => minimizeKeys(item, keysMap, new Map()) as MinimizedUserPref
  );
};

export const unminimizePrefsFromStorage = (
  obj: AnyData[]
): SyncableUserPref[] => {
  return obj.map(
    o => unminimizeKeys(o, keysMapReverse, new Map()) as SyncableUserPref
  );
};
