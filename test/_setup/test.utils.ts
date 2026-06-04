import TinybaseProvider from '@/app/providers/TinybaseProvider';
import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdatableNonConflictFields,
  CollectionItemUpdateChangeFields
} from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import { space, store } from '@/core/db/store';
import { DbSerializableData, setMetaField, WithId } from '@/core/db/types';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { docAnnotationsService } from '@/domain/document-annotations/doc-annotations.service';
import { DocAnnotationRow } from '@/domain/document-annotations/model';
import { Notebook } from '@/notebooks/notebooks';
import { renderHook } from '@testing-library/react';
import { getUniqueId } from 'tinybase/with-schemas';
import { expect, vi } from 'vitest';

export function wrappedRenderHook<Result, Props>(
  render: (initialProps: Props) => Result
) {
  return renderHook(render, { wrapper: TinybaseProvider });
}

export function nukeStorage() {
  store.setContent([{}, {}]);
  space.setContent([{}, {}]);
}

export const amount = async (timeout = 500) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const fakeTimersDelay = 100;

export const oneDocument = (
  title = 'new doc',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  const id = getUniqueId();
  return {
    ...collectionService.getNewDocumentObj(parent).item,
    id,
    itemId: id,
    title,
    title_meta: setMetaField(Date.now(), title)
  };
};
export const oneFolder = (
  title = 'new folder',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  const id = getUniqueId();
  return {
    ...collectionService.getNewFolderObj(parent).item,
    id,
    itemId: id,
    title,
    title_meta: setMetaField(Date.now(), title)
  };
};
export const oneNotebook = (
  title = 'new notebook',
  id = DEFAULT_NOTEBOOK_ID
): Notebook => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    ...notebooksService.getNewNotebookObj(ROOT_COLLECTION, title).item,
    id,
    itemId: id
  };
};

export const oneNote = (docId: string): WithId<DocAnnotationRow> => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  const id = getUniqueId();
  return {
    ...docAnnotationsService.newNoteObj(docId).item,
    id
  };
};

type ItemTypesType = {
  type: string;
  typeVal: CollectionItemTypeValues;
  addMethod: 'addDocument' | 'addFolder' | 'addNotebook';
  testAddFn: (title?: string, parent?: string) => CollectionItem;
  defaultTitle: string;
};

export const NON_NOTEBOOK_BROWSABLE_ITEM_TYPES: ItemTypesType[] = [
  {
    type: 'document',
    typeVal: CollectionItemType.document,
    addMethod: 'addDocument',
    testAddFn: oneDocument,
    defaultTitle: 'New document'
  },
  {
    type: 'folder',
    typeVal: CollectionItemType.folder,
    addMethod: 'addFolder',
    testAddFn: oneFolder,
    defaultTitle: 'New folder'
  }
];

export const BROWSABLE_ITEM_TYPES: ItemTypesType[] = [
  ...NON_NOTEBOOK_BROWSABLE_ITEM_TYPES,
  {
    type: 'notebook',
    typeVal: CollectionItemType.notebook,
    addMethod: 'addNotebook',
    testAddFn: oneNotebook,
    defaultTitle: ''
  }
];

export const ITEM_TYPES: ItemTypesType[] = [...BROWSABLE_ITEM_TYPES];

export const NON_NOTEBOOK_ITEM_TYPES: ItemTypesType[] = ITEM_TYPES.filter(
  i => i.type !== 'notebook' // TODO revert
);

export type ValueType =
  | 'id'
  | 'string'
  | 'lex'
  | 'number'
  | 'boolean'
  | 'display_opts'
  | 'flags';
export const NON_PARENT_UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
  valueType: ValueType;
}[] = [
  { field: 'title', valueType: 'string' },
  { field: 'content', valueType: 'lex' },
  { field: 'tags', valueType: 'string' },
  { field: 'order', valueType: 'number' },
  { field: 'display_opts', valueType: 'display_opts' },
  { field: 'flags', valueType: 'flags' }
];

export const getNewContent = (text: string) => {
  return `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${text}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;
};

export type TestField = {
  field: CollectionItemUpdatableFieldEnum;
  valueType: ValueType;
};

export const parentField: TestField = { field: 'parent', valueType: 'id' };
export const titleField: TestField = { field: 'title', valueType: 'string' };
export const contentField: TestField = { field: 'content', valueType: 'lex' };
export const tagsField: TestField = { field: 'tags', valueType: 'string' };
export const orderField: TestField = { field: 'order', valueType: 'number' };
export const displayOptsField: TestField = {
  field: 'display_opts',
  valueType: 'display_opts'
};
export const flagsField: TestField = {
  field: 'flags',
  valueType: 'flags'
};

export const allFields: TestField[] = [
  titleField,
  contentField,
  tagsField,
  orderField,
  displayOptsField,
  flagsField
];

export const conflictFields: TestField[] = [titleField, contentField];

export const nonConflictFields: TestField[] = [
  tagsField,
  displayOptsField,
  flagsField
];

export const allHistorizableFields: TestField[] = [
  titleField,
  contentField,
  tagsField,
  displayOptsField
];

export const getNewValue = (
  valueType: ValueType,
  potentialId?: string
): DbSerializableData => {
  if (valueType === 'string') return `new string value ${getUniqueId()}`;
  if (valueType === 'lex') return getNewContent(`Sample text ${getUniqueId()}`);
  if (valueType === 'id') return potentialId ? potentialId : ROOT_COLLECTION;
  if (valueType === 'display_opts')
    return JSON.stringify({
      sort: { rand: Math.floor(Math.random() * 10001) }
    });
  if (valueType === 'flags')
    return {
      statsEnabled: Math.floor(Math.random() * 10001) % 2 === 0
    };
  if (valueType === 'number') return Math.floor(Math.random() * 10001);
  return true;
};

export const UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
  valueType: ValueType;
}[] = [...NON_PARENT_UPDATABLE_FIELDS, { field: 'parent', valueType: 'id' }];

const NON_CONFLICT_CHANGES: {
  local: CollectionItemUpdatableFieldEnum;
  localValueType: ValueType;
  remote: CollectionItemUpdatableFieldEnum;
  remoteValueType: ValueType;
}[] = [];
UPDATABLE_FIELDS.forEach(({ field: local, valueType: localValueType }) => {
  UPDATABLE_FIELDS.forEach(({ field: remote, valueType: remoteValueType }) => {
    if (
      local !== remote ||
      CollectionItemUpdatableNonConflictFields.includes(local)
    ) {
      NON_CONFLICT_CHANGES.push({
        local,
        localValueType,
        remote,
        remoteValueType
      });
    }
  });
});

export const CONFLICT_CHANGES = UPDATABLE_FIELDS.filter(f =>
  CollectionItemUpdatableConflictFields.includes(f.field)
).map(f => ({
  field: f.field,
  valueType: f.valueType,
  local: f.field,
  localValueType: f.valueType,
  remote: f.field,
  remoteValueType: f.valueType
}));

const filterPerType = (field: string, type: string) => {
  if (type === 'folder' || type === 'notebook') {
    return field !== 'content';
  }
  return true;
};

const filterPerLocalRemoteAndType = (
  local: string,
  remote: string,
  type: string
) => {
  return filterPerType(local, type) && filterPerType(remote, type);
};

export const GET_UPDATABLE_FIELDS = (type: string) =>
  UPDATABLE_FIELDS.filter(f => filterPerType(f.field, type));

export const GET_NON_PARENT_UPDATABLE_FIELDS = (type: string) =>
  NON_PARENT_UPDATABLE_FIELDS.filter(f => filterPerType(f.field, type));

export const GET_NON_CONFLICT_CHANGES = (type: string) =>
  NON_CONFLICT_CHANGES.filter(f =>
    filterPerLocalRemoteAndType(f.local, f.remote, type)
  );

export const GET_CONFLICT_CHANGES = (type: string) =>
  CONFLICT_CHANGES.filter(f =>
    filterPerLocalRemoteAndType(f.local, f.remote, type)
  );

export const GET_ALL_CHANGES = (type: string) =>
  [...CONFLICT_CHANGES, ...NON_CONFLICT_CHANGES].filter(f =>
    filterPerLocalRemoteAndType(f.local, f.remote, type)
  );

export const GET_CONTENT_UPDATE_FIELDS = (type: string) =>
  UPDATABLE_FIELDS.filter(f => filterPerType(f.field, type)).filter(f =>
    CollectionItemUpdateChangeFields.includes(f.field)
  );

export const getRowCountInsideNotebook = (notebook?: string) => {
  if (!notebook) {
    notebook = DEFAULT_NOTEBOOK_ID;
  }
  return collectionService.getAllCollectionItemsRecursive(notebook).length;
};

export const countOrphans = () => {
  let orphans = 0;
  space.getRowIds('collection').forEach(rowId => {
    const parent = collectionService.getItemParent(rowId);
    const parentExists = collectionService.itemExists(parent);
    if (!parentExists) {
      orphans++;
    }
  });
  return orphans;
};

export const getRowIdsInsideNotebook = (notebook?: string) => {
  if (!notebook) {
    notebook = DEFAULT_NOTEBOOK_ID;
  }
  return collectionService
    .getAllCollectionItemsRecursive(notebook)
    .map(i => i.id);
};

export const getCollectionItem = (id: string) => {
  return space.getRow('collection', id) as CollectionItem;
};

export const getLocalItemField = (rowId: string, field: string) => {
  return collectionService.getItemField(
    rowId,
    field as CollectionItemFieldEnum
  );
};

export const setLocalItemField = (
  rowId: string,
  field: string,
  newValue: DbSerializableData
) => {
  adv(() => {
    collectionService.setItemField(
      rowId,
      field as CollectionItemUpdatableFieldEnum,
      newValue
    );
  });
};

export const adv = (cb: () => any, delay = fakeTimersDelay) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(delay);
  const resp = cb();
  if (vi.isFakeTimers()) vi.advanceTimersByTime(delay);
  return resp;
};

export const updateOnRemote = (
  remoteData: CollectionItem[],
  id: string,
  field: string,
  newValue: DbSerializableData
) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  const idx = remoteData.findIndex(r => r.id === id);
  const remoteKey = field as CollectionItemUpdatableFieldEnum;
  remoteData[idx][remoteKey] = newValue as never;
  remoteData[idx][`${remoteKey}_meta`] = setMetaField(
    Date.now(),
    `${newValue}`
  );
  if (remoteKey !== 'parent') {
    remoteData[idx].updated = Date.now();
  }
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('after updateOnRemote', idx, id, field, remoteData);
  return remoteData;
};

export const getRemoteItemField = (
  content: CollectionItem[],
  id: string,
  field: string
) => {
  return content.find(i => i.id === id)![field as CollectionItemFieldEnum];
};

export const getLocalItemConflict = () => {
  const rowIds = space.getRowIds('collection');
  let conflictId;
  rowIds.forEach(id => {
    if (collectionService.isItemConflict(id)) {
      conflictId = id;
    }
  });
  return conflictId;
};

export const getLocalItemConflicts = () => {
  const rowIds = space.getRowIds('collection');
  const conflictIds: string[] = [];
  rowIds.forEach(id => {
    if (collectionService.isItemConflict(id)) {
      conflictIds.push(id);
    }
  });
  return conflictIds;
};

export const markAsConflict = (rowId: string, conflict: string) => {
  space.setCell('collection', rowId, 'conflict', conflict);
};

export const expectHasLocalItemConflict = (
  conflictId: string,
  yesNo: boolean
) => {
  const rowIds = space.getRowIds('collection');
  if (yesNo) {
    expect(rowIds).toContain(conflictId);
  } else {
    expect(rowIds).not.toContain(conflictId);
  }
};

export const getDocsFolders = (items: CollectionItem[]) =>
  items.filter(i => i.type !== CollectionItemType.notebook);

export const createLocalItem = (
  data: Partial<CollectionItem>,
  ids = new Map<string, string>()
) => {
  const createItem = (item: CollectionItem, data: Partial<CollectionItem>) => {
    item.title = data.title!;
    if (data.id) {
      ids.set(data.id, item.id!);
    }
    if (data.parent) {
      item.parent = data.parent.startsWith('#')
        ? ids.get(data.parent)!
        : data.parent;
    }
    return item;
  };
  if (data.type === CollectionItemType.document) {
    const { item, id } = collectionService.getNewDocumentObj(data.parent!);
    return createItem({ ...item, id }, data);
  } else if (data.type === CollectionItemType.folder) {
    const { item, id } = collectionService.getNewFolderObj(data.parent!);
    return createItem({ ...item, id }, data);
  } else if (data.type === CollectionItemType.notebook) {
    const { item, id } = notebooksService.getNewNotebookObj(
      data.parent!,
      data.title
    );
    return createItem({ ...item, id }, data);
  }
  throw new Error('unsupported type in test: ' + data.type);
};

export const createInitLocalData = (initData: Partial<CollectionItem>[]) => {
  const ids = new Map<string, string>();

  const initialItems: CollectionItem[] = initData.map(data =>
    createLocalItem(data, ids)
  );
  console.debug('initial items', initialItems);
  if (initialItems.length > 0) {
    collectionService.saveItems(initialItems, DEFAULT_NOTEBOOK_ID);
  }
  return { ids, initialItems };
};
