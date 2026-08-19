/* eslint-disable @typescript-eslint/no-explicit-any */

export const minimizeKeys = (
  obj: any,
  keys: Map<string, string>,
  keywords: Map<string, string>,
  excludeKeys: string[] = []
) => {
  const m = {} as any;
  if (obj === undefined || obj === null) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'boolean') return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keys.has(k) ? keys.get(k)! : k;
    if (typeof obj[k] === 'string') {
      if (!excludeKeys.some(ek => ek === k)) {
        m[newKey] = keywords.has(obj[k]) ? keywords.get(obj[k]) : obj[k];
      } else {
        m[newKey] = obj[k];
      }
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (typeof obj[k] === 'boolean') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o => minimizeKeys(o, keys, keywords, excludeKeys));
    } else {
      m[newKey] = minimizeKeys(obj[k], keys, keywords, excludeKeys);
    }
  });
  return m;
};

export const unminimizeKeys = (
  obj: any,
  keys: Map<string, string>,
  keywords: Map<string, string>,
  excludeKeys: string[] = []
) => {
  const m = {} as any;
  if (obj === undefined || obj === null) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'boolean') return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keys.has(k) ? keys.get(k)! : k;
    if (typeof obj[k] === 'string') {
      if (!excludeKeys.some(ek => ek === newKey)) {
        m[newKey] = keywords.has(obj[k]) ? keywords.get(obj[k]) : obj[k];
      } else {
        m[newKey] = obj[k];
      }
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (typeof obj[k] === 'boolean') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o =>
        unminimizeKeys(o, keys, keywords, excludeKeys)
      );
    } else {
      m[newKey] = unminimizeKeys(obj[k], keys, keywords, excludeKeys);
    }
  });
  return m;
};

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

export const unminimizeContentFromStorage = (json: string) => {
  return JSON.stringify(
    unminimizeKeys(JSON.parse(json), keysMapReverse, keywordsMapReverse, [
      'text'
    ])
  );
};
