import {
  CollectionItem,
  CollectionItemFieldEnum,
  CollectionItemType,
  CollectionItemTypeValues,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import storageService from '@/db/storage.service';
import { getUniqueId } from 'tinybase/with-schemas';
import { expect, vi } from 'vitest';

export const amount = async (timeout = 500) => {
  return new Promise(resolve => setTimeout(resolve, timeout));
};

export const fakeTimersDelay = 100;

export const oneDocument = (title = 'new doc', parent = ROOT_FOLDER) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    parent,
    type: CollectionItemType.document,
    title,
    content: 'random',
    created: Date.now(),
    updated: Date.now(),
    deleted: false
  } as CollectionItem;
};
export const oneFolder = (title = 'new folder', parent = ROOT_FOLDER) => {
  if (vi.isFakeTimers()) vi.advanceTimersByTime(fakeTimersDelay);
  return {
    id: getUniqueId(),
    parent,
    type: CollectionItemType.folder,
    title,
    created: Date.now(),
    updated: Date.now(),
    deleted: false
  } as CollectionItem;
};

type itemTypesType = {
  type: string;
  typeVal: CollectionItemTypeValues;
  addMethod: 'addDocument' | 'addFolder';
  defaultTitle: string;
};
export const ITEM_TYPES: itemTypesType[] = [
  {
    type: 'document',
    typeVal: 'd',
    addMethod: 'addDocument',
    defaultTitle: 'New document'
  },
  {
    type: 'folder',
    typeVal: 'f',
    addMethod: 'addFolder',
    defaultTitle: 'New folder'
  }
];

export const NON_PARENT_UPDATABLE_FIELDS: {
  field: CollectionItemUpdatableFieldEnum;
}[] = [{ field: 'title' }, { field: 'content' }];

export const UPDATABLE_FIELDS: { field: CollectionItemUpdatableFieldEnum }[] = [
  ...NON_PARENT_UPDATABLE_FIELDS,
  { field: 'parent' }
];
export const NON_PARENT_CHANGES = [
  {
    local: 'title',
    remote: 'title'
  },
  {
    local: 'title',
    remote: 'content'
  },
  {
    local: 'content',
    remote: 'title'
  },
  {
    local: 'content',
    remote: 'content'
  }
];
export const PARENT_CHANGES = [
  {
    local: 'parent',
    remote: 'parent'
  },
  {
    local: 'parent',
    remote: 'title'
  },
  {
    local: 'title',
    remote: 'parent'
  }
];

export const getCollectionRowCount = () => {
  return storageService.getSpace().getRowCount('collection');
};

export const getCollectionRowIds = () => {
  return storageService.getSpace().getRowIds('collection');
};

export const getCollectionItem = (id: string) => {
  return storageService.getSpace().getRow('collection', id) as CollectionItem;
};

export const getLocalItemByTitle = (title: string) => {
  let id;
  storageService
    .getSpace()
    .getRowIds('collection')
    .forEach(rowId => {
      if (
        storageService
          .getSpace()
          .getCell('collection', rowId, 'title')
          ?.valueOf() === title
      ) {
        id = rowId;
      }
    });
  expect(id).toBeDefined();
  return id;
};

export const getFirstLocalItem = () => {
  return storageService.getSpace().getRowIds('collection')[0];
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
