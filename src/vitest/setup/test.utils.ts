import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum,
  setFieldMeta
} from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import { Notebook } from '@/notebooks/notebooks';
import { getUniqueId } from 'tinybase/with-schemas';
import { expect, vi } from 'vitest';

export const amount = async (timeout = 500) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const fakeTimersDelay = 100;

// TODO use new methods from collection service
export const oneDocument = (
  title = 'new doc',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    type: CollectionItemType.document,
    parent,
    parent_meta: setFieldMeta(parent, Date.now()),
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
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    parent,
    parent_meta: setFieldMeta(parent, Date.now()),
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
export const oneNotebook = (
  title = 'new notebook',
  id = DEFAULT_NOTEBOOK_ID
): Notebook => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id,
    type: CollectionItemType.notebook,
    parent: ROOT_COLLECTION,
    parent_meta: setFieldMeta(ROOT_COLLECTION, Date.now()),
    title,
    title_meta: setFieldMeta(title, Date.now()),
    created: Date.now(),
    updated: Date.now(),
    deleted: false,
    deleted_meta: setFieldMeta('false', Date.now())
  };
};
export const onePage = (
  title = 'new doc',
  parent = DEFAULT_NOTEBOOK_ID
): CollectionItem => {
  // note: title param is just there so the method has the same signature as the others
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    type: CollectionItemType.page,
    parent,
    parent_meta: setFieldMeta(parent, Date.now()),
    title: '',
    title_meta: setFieldMeta('title', Date.now()),
    content: 'random',
    content_meta: setFieldMeta('random', Date.now()),
    created: Date.now(),
    updated: Date.now(),
    deleted: false,
    deleted_meta: setFieldMeta('false', Date.now())
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

export const NON_PARENT_UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
}[] = [{ field: 'title' }, { field: 'content' }, { field: 'tags' }];

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
  if (field === 'content') {
    remoteData[idx].preview = newValue.substring(0, 80);
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
