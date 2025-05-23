import { minimizeKeys, unminimizeKeys } from '../utils';

const keys = [
  ['children', 'c'],
  ['detail', 'd'],
  ['direction', 'di'],
  ['format', 'f'],
  ['indent', 'i'],
  ['listType', 'l'],
  ['mode', 'm'],
  ['root', 'r'],
  ['start', 'st'],
  ['style', 's'],
  ['tag', 'ta'],
  ['text', 't'],
  ['textFormat', 'tf'],
  ['textStyle', 'ts'],
  ['type', 'ty'],
  ['value', 'va'],
  ['version', 'v']
];
const keysMap = new Map();
const keysMapReverse = new Map();
keys.forEach(([v1, v2]) => {
  keysMap.set(v1, v2);
  keysMapReverse.set(v2, v1);
});

const keywords = [
  ['bullet', 'b'],
  ['center', 'c'],
  ['heading', 'h'],
  ['horizontalrule', 'hr'],
  ['justify', 'j'],
  ['left', 'le'],
  ['linebreak', 'l'],
  ['list', 'ls'],
  ['listitem', 'li'],
  ['ltr', 'lt'],
  ['normal', 'n'],
  ['number', 'nu'],
  ['paragraph', 'p'],
  ['quote', 'q'],
  ['right', 'ri'],
  ['root', 'r'],
  ['text', 't']
];
const keywordsMap = new Map();
const keywordsMapReverse = new Map();
keywords.forEach(([v1, v2]) => {
  keywordsMap.set(v1, v2);
  keywordsMapReverse.set(v2, v1);
});

export const minimizeContentForStorage = (json: string) => {
  return JSON.stringify(minimizeKeys(JSON.parse(json), keysMap, keywordsMap));
};

export const unminimizeContentFromStorage = (json: string) => {
  return JSON.stringify(
    unminimizeKeys(JSON.parse(json), keysMapReverse, keywordsMapReverse)
  );
};
