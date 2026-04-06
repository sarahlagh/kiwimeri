import { CollectionItemType, isPageOrDocument } from '@/collection/collection';
import { unminimizeKeys } from '@/common/utils';
import { Store } from 'tinybase/with-schemas';
import { SpaceType } from '../types/space-types';

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

const unminimizeContentFromStorage = (json: string) => {
  return JSON.stringify(
    unminimizeKeys(JSON.parse(json), keysMapReverse, keywordsMapReverse, [
      'text'
    ])
  );
};

export default function Migration(space: Store<SpaceType>) {
  {
    const collection = space.getTable('collection');
    const rowIds = space.getRowIds('collection');
    rowIds.forEach(rowId => {
      const type = collection[rowId].type as CollectionItemType; 
      if (!isPageOrDocument({type})) return;
      const json = collection[rowId].content!.toString();
      const content = unminimizeContentFromStorage(json);
      space.setCell('collection', rowId, 'content', content);
    });
  }
  {
    const historyContent = space.getTable('history_content');
    const rowIds = space.getRowIds('history_content');
    rowIds.forEach(rowId => {
      const json = historyContent[rowId].content!.toString();
      const content = unminimizeContentFromStorage(json);
      space.setCell('history_content', rowId, 'content', content);
    });
  }
}
