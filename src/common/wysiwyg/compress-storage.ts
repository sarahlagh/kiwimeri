/* eslint-disable @typescript-eslint/no-explicit-any */
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

const minimizeKeys = (obj: any) => {
  const m = {} as any;
  if (!obj) return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keysMap.has(k) ? keysMap.get(k) : k;
    if (typeof obj[k] === 'string') {
      m[newKey] = keywordsMap.has(obj[k]) ? keywordsMap.get(obj[k]) : obj[k];
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o => minimizeKeys(o));
    } else {
      m[newKey] = minimizeKeys(obj[k]);
    }
  });
  return m;
};

const unminimizeKeys = (obj: any) => {
  const m = {} as any;
  if (!obj) return obj;
  Object.keys(obj).forEach(k => {
    const newKey = keysMapReverse.has(k) ? keysMapReverse.get(k) : k;
    if (typeof obj[k] === 'string') {
      m[newKey] = keywordsMapReverse.has(obj[k])
        ? keywordsMapReverse.get(obj[k])
        : obj[k];
    } else if (typeof obj[k] === 'number') {
      m[newKey] = obj[k];
    } else if (Array.isArray(obj[k])) {
      m[newKey] = obj[k].map(o => unminimizeKeys(o));
    } else {
      m[newKey] = unminimizeKeys(obj[k]);
    }
  });
  return m;
};

export const minimizeForStorage = (json: string) => {
  return JSON.stringify(minimizeKeys(JSON.parse(json)));
};

export const unminimizeFromStorage = (json: string) => {
  return JSON.stringify(unminimizeKeys(JSON.parse(json)));
};
