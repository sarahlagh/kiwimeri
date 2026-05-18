import { CollectionItem, CollectionItemWithId } from '@/collection/collection';
import { minimizeKeys, unminimizeKeys } from '../common/utils';
import { AnyData } from '../db/types/store-types';

const keys = [
  ['id', 'i'],
  ['parent', 'p'],
  ['parent_meta', 'P'],
  ['type', 'ty'],
  ['title', 't'],
  ['title_meta', 'T'],
  ['content', 'c'],
  ['content_meta', 'C'],
  ['preview', 'pw'],
  ['tags', 'ta'],
  ['tags_meta', 'TA'],
  ['created', 'cr'],
  ['updated', 'u'],
  ['deleted', 'd'],
  ['deleted_meta', 'D'],
  ['order', 'o'],
  ['order_meta', 'O'],
  ['display_opts', 'do'],
  ['display_opts_meta', 'DO']
];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MIN_KEYS = [
  'i',
  'p',
  'P',
  'ty',
  't',
  'T',
  'c',
  'C',
  'pw',
  'ta',
  'TA',
  'cr',
  'u',
  'd',
  'D',
  'o',
  'O',
  'do',
  'DO'
] as const;
export type MinKeys = typeof MIN_KEYS;

const keysMap = new Map();
const keysMapReverse = new Map();
keys.forEach(([v1, v2]) => {
  keysMap.set(v1, v2);
  keysMapReverse.set(v2, v1);
});

export const minimizeItemsForStorage = (obj: CollectionItem[]) => {
  return obj
    .map(obj => ({ ...obj, itemId: undefined }))
    .map(item => minimizeKeys(item, keysMap, new Map()));
};

export const unminimizeItemsFromStorage = (
  obj: AnyData[]
): CollectionItemWithId[] => {
  return obj
    .map(
      o => unminimizeKeys(o, keysMapReverse, new Map()) as CollectionItemWithId
    )
    .map(o => ({ ...o, itemId: o.id! }));
};
