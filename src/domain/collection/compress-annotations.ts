import { AnyData, SerializableData } from '@/core/db/types';
import { minimizeKeys, unminimizeKeys } from '@/shared/utils';
import {
  minimizeContentForStorage,
  unminimizeContentFromStorage
} from './compress-file-content';
import { DocAnnotation } from './document-annotations';

const keys = [
  ['id', 'i'],
  ['type', 't'],
  ['parentId', 'p'],
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

export const minimizeAnnotForStorage = (obj: DocAnnotation[]) => {
  return obj
    .map(o => ({ ...o }))
    .map(annot => {
      if (annot.content) {
        annot.content = minimizeContentForStorage(JSON.parse(annot.content));
      }
      return minimizeKeys(annot, keysMap, new Map()) as MinimizedDocAnnotation;
    });
};

export const unminimizeAnnotFromStorage = (obj: AnyData[]): DocAnnotation[] => {
  return obj
    .map(o => unminimizeKeys(o, keysMapReverse, new Map()) as DocAnnotation)
    .map(annot => {
      if (annot.content) {
        annot.content = unminimizeContentFromStorage(annot.content);
      }
      return annot;
    });
};
