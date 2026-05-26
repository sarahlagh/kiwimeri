import { minimizeKeys, unminimizeKeys } from '@/common/utils';
import { AnyData, SerializableData } from '@/db/types/store-types';
import { SyncableComment } from './model';

const keys = [
  ['id', 'i'],
  ['itemId', 'p'],
  ['createdAt', 'cr'],
  ['updatedAt', 'u'],
  ['content', 'c'],
  ['content_meta', 'C'],
  ['order', 'o'],
  ['order_meta', 'O']
];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIN_KEYS = ['i', 'p', 'c', 'C', 'cr', 'u', 'o', 'O'] as const;
export type CommentsMinKeys = typeof MIN_KEYS;

export type MinimizedComments = {
  [key in CommentsMinKeys[number]]: SerializableData | undefined;
};

const keysMap = new Map();
const keysMapReverse = new Map();
keys.forEach(([v1, v2]) => {
  keysMap.set(v1, v2);
  keysMapReverse.set(v2, v1);
});

export const minimizeCommentsForStorage = (obj: SyncableComment[]) => {
  return obj
    .map(obj => ({ ...obj, plainText: undefined }))
    .map(item => minimizeKeys(item, keysMap, new Map()) as MinimizedComments);
};

export const unminimizeCommentsFromStorage = (
  obj: AnyData[]
): SyncableComment[] => {
  return obj
    .map(o => unminimizeKeys(o, keysMapReverse, new Map()))
    .map(o => ({ ...o }) as SyncableComment);
};
