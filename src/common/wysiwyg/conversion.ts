const keys = [
  ['children', 'c'],
  ['detail', 'd'],
  ['direction', 'di'],
  ['format', 'f'],
  ['indent', 'i'],
  ['mode', 'm'],
  ['root', 'r'],
  ['style', 's'],
  ['tag', 'ta'],
  ['text', 't'],
  ['textFormat', 'tf'],
  ['textStyle', 'ts'],
  ['type', 'ty'],
  ['version', 'v']
];
const keywords = [
  ['heading', 'h'],
  ['horizontalrule', 'hr'],
  ['left', 'le'],
  ['linebreak', 'l'],
  ['ltr', 'lt'],
  ['normal', 'n'],
  ['paragraph', 'p'],
  ['root', 'r'],
  ['text', 't']
];

export const minimizeForStorage = (json: string) => {
  let newJson = json;
  for (const pair of keys) {
    newJson = newJson.replaceAll(`"${pair[0]}":`, `"${pair[1]}":`);
  }
  for (const pair of keywords) {
    newJson = newJson.replaceAll(`:"${pair[0]}"`, `:"${pair[1]}"`);
  }
  return newJson;
};

export const unminimizeFromStorage = (json: string) => {
  let newJson = json;
  for (const pair of keys) {
    newJson = newJson.replaceAll(`"${pair[1]}":`, `"${pair[0]}":`);
  }
  for (const pair of keywords) {
    newJson = newJson.replaceAll(`:"${pair[1]}"`, `:"${pair[0]}"`);
  }
  return newJson;
};
