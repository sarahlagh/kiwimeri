import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableConflictFields,
  CollectionItemUpdatableFieldEnum,
  CollectionItemUpdatableNonConflictFields,
  setFieldMeta
} from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { SerializableData } from '@/db/types/store-types';
import { Notebook } from '@/notebooks/notebooks';
import { getUniqueId } from 'tinybase/with-schemas';
import { expect, vi } from 'vitest';

export const amount = async (timeout = 500) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const fakeTimersDelay = 100;

export const oneDocument = (
  title = 'new doc',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    ...collectionService.getNewDocumentObj(parent).item,
    id: getUniqueId(),
    title,
    title_meta: setFieldMeta(title, Date.now())
  };
};
export const oneFolder = (
  title = 'new folder',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    ...collectionService.getNewFolderObj(parent).item,
    id: getUniqueId(),
    title,
    title_meta: setFieldMeta(title, Date.now())
  };
};
export const oneNotebook = (
  title = 'new notebook',
  id = DEFAULT_NOTEBOOK_ID
): Notebook => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    ...notebooksService.getNewNotebookObj(ROOT_COLLECTION, title).item,
    id
  };
};
export const onePage = (
  title = '',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  // note: title param is just there so the method has the same signature as the others
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    ...collectionService.getNewPageObj(parent).item,
    id: getUniqueId(),
    title: '',
    title_meta: setFieldMeta('', Date.now())
  };
};

type ItemTypesType = {
  type: string;
  typeVal: CollectionItemTypeValues;
  addMethod: 'addDocument' | 'addFolder' | 'addPage' | 'addNotebook';
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

export const ITEM_TYPES: ItemTypesType[] = [
  ...BROWSABLE_ITEM_TYPES,
  {
    type: 'page',
    typeVal: CollectionItemType.page,
    addMethod: 'addPage',
    testAddFn: onePage,
    defaultTitle: ''
  }
];

export const NON_NOTEBOOK_ITEM_TYPES: ItemTypesType[] = ITEM_TYPES.filter(
  i => i.type !== 'notebook'
);

export type ValueType = 'id' | 'string' | 'json' | 'number' | 'boolean';
export const NON_PARENT_UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
  valueType: ValueType;
}[] = [
  { field: 'title', valueType: 'string' },
  { field: 'content', valueType: 'string' },
  { field: 'tags', valueType: 'string' },
  // { field: 'deleted', valueType: 'boolean' }, // TODO
  { field: 'order', valueType: 'number' },
  { field: 'display_opts', valueType: 'json' }
];

export const getNewValue = (
  valueType: ValueType,
  potentialId?: string
): SerializableData => {
  if (valueType === 'string') return `new string value ${getUniqueId()}`;
  if (valueType === 'id') return potentialId ? potentialId : ROOT_COLLECTION;
  if (valueType === 'json')
    return JSON.stringify({
      rand: Math.floor(Math.random() * 10001)
    });
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
  if (type === 'page') {
    return field !== 'title' && field !== 'tags' && field !== 'display_opts';
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

export const getRowCountInsideNotebook = (notebook?: string) => {
  if (!notebook) {
    notebook = DEFAULT_NOTEBOOK_ID;
  }
  return collectionService.getAllCollectionItemsRecursive(notebook).length;
};

export const countOrphans = () => {
  let orphans = 0;
  storageService
    .getSpace()
    .getRowIds('collection')
    .forEach(rowId => {
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
  return storageService.getSpace().getRow('collection', id) as CollectionItem;
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
  newValue: SerializableData
) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  collectionService.setItemField(
    rowId,
    field as CollectionItemUpdatableFieldEnum,
    newValue
  );
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
};

export const updateOnRemote = (
  remoteData: CollectionItem[],
  id: string,
  field: string,
  newValue: SerializableData
) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  const idx = remoteData.findIndex(r => r.id === id);
  const remoteKey = field as CollectionItemUpdatableFieldEnum;
  remoteData[idx][remoteKey] = newValue as never;
  remoteData[idx][`${remoteKey}_meta`] = setFieldMeta(
    `${newValue}`,
    Date.now()
  );
  if (remoteKey !== 'parent') {
    remoteData[idx].updated = Date.now();
  }
  if (field === 'content') {
    remoteData[idx].preview = `${newValue}`.substring(0, 80);
  }
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('after updateOnRemote', id, field, remoteData);
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
  const rowIds = storageService.getSpace().getRowIds('collection');
  let conflictId;
  rowIds.forEach(id => {
    if (collectionService.isItemConflict(id)) {
      conflictId = id;
    }
  });
  return conflictId;
};

export const getLocalItemConflicts = () => {
  const rowIds = storageService.getSpace().getRowIds('collection');
  const conflictIds: string[] = [];
  rowIds.forEach(id => {
    if (collectionService.isItemConflict(id)) {
      conflictIds.push(id);
    }
  });
  return conflictIds;
};

export const markAsConflict = (rowId: string, conflict: string) => {
  storageService.getSpace().setCell('collection', rowId, 'conflict', conflict);
};

export const expectHasLocalItemConflict = (
  conflictId: string,
  yesNo: boolean
) => {
  const rowIds = storageService.getSpace().getRowIds('collection');
  if (yesNo) {
    expect(rowIds).toContain(conflictId);
  } else {
    expect(rowIds).not.toContain(conflictId);
  }
};

export const getDocsFolders = (items: CollectionItem[]) =>
  items.filter(i => i.type !== CollectionItemType.notebook);
