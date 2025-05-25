import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  setFieldMeta
} from '@/collection/collection';
import { ROOT_FOLDER, ROOT_NOTEBOOK } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { Notebook } from '@/notebooks/notebooks';
import { getUniqueId } from 'tinybase/with-schemas';
import { expect, vi } from 'vitest';

export const amount = async (timeout = 500) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const fakeTimersDelay = 100;

export const oneDocument = (
  title = 'new doc',
  parent = ROOT_FOLDER
): CollectionItem => {
  const notebook = notebooksService.getCurrentNotebook();
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    type: CollectionItemType.document,
    parent,
    parent_meta: setFieldMeta(parent, Date.now()),
    notebook,
    notebook_meta: setFieldMeta(notebook, Date.now()),
    title,
    title_meta: setFieldMeta(title, Date.now()),
    content: 'random',
    content_meta: setFieldMeta('random', Date.now()),
    tags: '',
    tags_meta: setFieldMeta('', Date.now()),
    created: Date.now(),
    updated: Date.now(),
    deleted: false,
    deleted_meta: setFieldMeta('false', Date.now())
  };
};
export const oneFolder = (
  title = 'new folder',
  parent = ROOT_FOLDER
): CollectionItem => {
  const notebook = notebooksService.getCurrentNotebook();
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    parent,
    parent_meta: setFieldMeta(parent, Date.now()),
    notebook,
    notebook_meta: setFieldMeta(notebook, Date.now()),
    type: CollectionItemType.folder,
    title,
    title_meta: setFieldMeta(title, Date.now()),
    tags: '',
    tags_meta: setFieldMeta('', Date.now()),
    created: Date.now(),
    updated: Date.now(),
    deleted: false,
    deleted_meta: setFieldMeta('false', Date.now())
  };
};
export const oneNotebook = (title = 'new notebook', id = '0'): Notebook => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id,
    type: CollectionItemType.notebook,
    parent: ROOT_NOTEBOOK,
    parent_meta: setFieldMeta(ROOT_NOTEBOOK, Date.now()),
    notebook: '',
    notebook_meta: setFieldMeta('', Date.now()),
    title,
    title_meta: setFieldMeta(title, Date.now()),
    created: Date.now(),
    updated: Date.now(),
    deleted: false,
    deleted_meta: setFieldMeta('false', Date.now())
  };
};

type itemTypesType = {
  type: string;
  typeVal: CollectionItemTypeValues;
  addMethod: 'addDocument' | 'addFolder';
  testAddFn: (title?: string, parent?: string) => CollectionItem;
  defaultTitle: string;
};
export const BROWSABLE_ITEM_TYPES: itemTypesType[] = [
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

export const NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
}[] = [{ field: 'title' }, { field: 'content' }, { field: 'tags' }];

export const NON_PARENT_UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
}[] = [...NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS, { field: 'notebook' }];

export const UPDATABLE_FIELDS: { field: CollectionItemUpdatableFieldEnum }[] = [
  ...NON_PARENT_UPDATABLE_FIELDS,
  { field: 'parent' }
];

const NON_CONFLICT_CHANGES: { local: string; remote: string }[] = [];
UPDATABLE_FIELDS.forEach(({ field: local }) => {
  UPDATABLE_FIELDS.forEach(({ field: remote }) => {
    if (local !== remote) {
      NON_CONFLICT_CHANGES.push({
        local,
        remote
      });
    }
  });
});

export const CONFLICT_CHANGES = UPDATABLE_FIELDS.map(field => ({
  ...field,
  local: field.field,
  remote: field.field
}));

const filterPerType = (field: string, type: string) => {
  if (type === 'folder' || type === 'notebook') {
    return field !== 'content';
  }
  if (type === 'page') {
    return field !== 'title' && field !== 'tags';
  }
  return true;
};

const filterPerLocalRemoteAndType = (
  local: string,
  remote: string,
  type: string
) => {
  if (type === 'folder' || type === 'notebook') {
    return local !== 'content' && remote !== 'content';
  }
  if (type === 'page') {
    return (
      local !== 'title' &&
      remote !== 'title' &&
      local !== 'tags' &&
      remote !== 'tags'
    );
  }
  return true;
};

export const GET_UPDATABLE_FIELDS = (type: string) =>
  UPDATABLE_FIELDS.filter(f => filterPerType(f.field, type));

export const GET_NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS = (type: string) =>
  NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS.filter(f =>
    filterPerType(f.field, type)
  );

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

export const getCollectionRowCount = () => {
  return collectionService.getAllCollectionItems().length;
};

export const getCollectionRowIds = () => {
  return collectionService.getAllCollectionItems().map(i => i.id);
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
  value = 'newLocal'
) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  collectionService.setItemField(
    rowId,
    field as CollectionItemUpdatableFieldEnum,
    value
  );
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
};

export const updateOnRemote = (
  remoteData: CollectionItem[],
  id: string,
  field: string,
  newValue = 'newRemote'
) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  const idx = remoteData.findIndex(r => r.id === id);
  const remoteKey = field as CollectionItemUpdatableFieldEnum;
  remoteData[idx][remoteKey] = newValue as never;
  remoteData[idx][`${remoteKey}_meta`] = setFieldMeta(newValue, Date.now());
  if (remoteKey !== 'parent') {
    remoteData[idx].updated = Date.now();
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
