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
// try to recognize common patterns in the json and reduce them
// this will result in an invalid json being stored
// with about 60% compression on average
const patterns = [
  ['{"r":{', '@R{'],
  ['{"c":[', '@C'],
  [/"(.{1,2})":(\d)/g, '$1$2', /([{,])?([^{,]{1,2})(\d)([,}])/g, '$1"$2":$3$4'],
  [/"(.{1,2})":""/g, '$1""', /([{,])?(.{1,2})""([,}])/g, '$1"$2":""$3'],
  [':null', ':', /:([,}])/g, ':null$1'],
  ['d0,f0', '@0'],
  ['@C@C', '@C2'],
  ['"m":"n",s"","t"', 'mnst', /([{,])?mnst:/g, '$1"m":"n",s"","t":'],
  [/"ty":"(.{1,2})",v1/g, 'ty1$1', /([{,])?ty1([^,}]{1,2})/g, '$1"ty":"$2",v1'],
  [/{@0,mnst:"(.*?)",ty1t}/g, '@{$1}', /@{(.*?)}/g, '{@0,mnst:"$1",ty1t}'],
  [/(,)?{ty1l},/g, '$1!,', /(,)?!,/g, '$1{ty1l},']
];

export const minimizeForStorage = (json: string) => {
  let newJson = json;
  for (const pair of keys) {
    newJson = newJson.replaceAll(`"${pair[0]}":`, `"${pair[1]}":`);
  }
  for (const pair of keywords) {
    newJson = newJson.replaceAll(`:"${pair[0]}"`, `:"${pair[1]}"`);
  }
  for (const pair of patterns) {
    newJson = newJson.replaceAll(pair[0], pair[1] as string);
  }
  return newJson;
};

export const unminimizeFromStorage = (json: string) => {
  let newJson = json;
  const patternsNeg = [...patterns].reverse();
  for (const pair of patternsNeg) {
    if (pair.length === 4) {
      newJson = newJson.replaceAll(pair[2], pair[3] as string);
    } else {
      newJson = newJson.replaceAll(pair[1], pair[0] as string);
    }
  }
  for (const pair of keywords) {
    newJson = newJson.replaceAll(`:"${pair[1]}"`, `:"${pair[0]}"`);
  }
  for (const pair of keys) {
    newJson = newJson.replaceAll(`"${pair[1]}":`, `"${pair[0]}":`);
  }
  return newJson;
};
