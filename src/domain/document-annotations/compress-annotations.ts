import { minimizeKeys, unminimizeKeys } from '@/common/utils';
import { AnyData, SerializableData } from '@/db/types/store-types';
import { SyncableAnnotation } from './model';

const keys = [
  ['id', 'i'],
  ['type', 't'],
  ['itemId', 'p'],
  ['createdAt', 'cr'],
  ['updatedAt', 'u'],
  ['content', 'c'],
  ['content_meta', 'C'],
  ['order', 'o'],
  ['order_meta', 'O']
];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIN_KEYS = ['i', 'p', 't', 'c', 'C', 'cr', 'u', 'o', 'O'] as const;
export type DocAnnotationMinKeys = typeof MIN_KEYS;

export type MinimizedDocAnnotation = {
  [key in DocAnnotationMinKeys[number]]: SerializableData | undefined;
};

const keysMap = new Map();
const keysMapReverse = new Map();
keys.forEach(([v1, v2]) => {
  keysMap.set(v1, v2);
  keysMapReverse.set(v2, v1);
});

export const minimizeAnnotForStorage = (obj: SyncableAnnotation[]) => {
  return obj
    .map(obj => ({ ...obj, plainText: undefined }))
    .map(
      item => minimizeKeys(item, keysMap, new Map()) as MinimizedDocAnnotation
    );
};

export const unminimizeAnnotFromStorage = (
  obj: AnyData[]
): SyncableAnnotation[] => {
  return obj
    .map(o => unminimizeKeys(o, keysMapReverse, new Map()))
    .map(o => ({ ...o }) as SyncableAnnotation);
};
