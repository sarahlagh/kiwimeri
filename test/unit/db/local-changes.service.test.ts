import { CollectionItemType } from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import { SerializableData } from '@/db/types/store-types';
import userSettingsService from '@/db/user-settings.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import {
  LocalChangeResult,
  LocalChangeType
} from '@/domain/local-changes/model';
import { describe, expect, it } from 'vitest';
import {
  GET_UPDATABLE_FIELDS,
  getLocalItemField,
  markAsConflict
} from '../../_setup/test.utils';

const getNonNotebookLocalChanges = (localChanges: LocalChangeResult[]) =>
  localChanges.filter(
    lc => lc.itemId !== notebooksService.getCurrentNotebook()
  );

describe('local changes service', () => {
  it('should only have notebook local changes by default', () => {
    expect(localChangesService.getLocalChanges()).toHaveLength(1);
    const lc = localChangesService.getLocalChanges()[0];
    expect(lc.change).toBe(LocalChangeType.add);
    expect(getLocalItemField(lc.itemId, 'type')).toBe(
      CollectionItemType.notebook
    );
  });

  it('should create a local change for each created items', () => {
    const createdItems: string[] = [];
    createdItems.push(collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    createdItems.push(collectionService.addFolder(DEFAULT_NOTEBOOK_ID));
    createdItems.push(collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(4);
    expect(getNonNotebookLocalChanges(localChanges).map(l => l.itemId)).toEqual(
      createdItems.toReversed()
    );
  });

  it('should merge local changes for each created then updated items into one change', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemField(id, 'content', 'new content');
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(2);
    const lc = getNonNotebookLocalChanges(localChanges)[0];
    expect(lc.itemId).toEqual(id);
    expect(lc.change).toEqual('a');
    expect(lc.field).toBeUndefined();
  });

  it('should merge local changes for each updated items into one change per field', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemTitle(id, 'new title 3');
    collectionService.setItemField(id, 'content', 'new content');
    const localChanges = localChangesService.getLocalChanges();

    expect(localChanges).toHaveLength(2);
    expect(localChanges.map(l => l.itemId)).toEqual([id, id]);
    expect(localChanges.map(l => l.change)).toEqual(['u', 'u']);
    expect(localChanges.map(l => l.field)).toEqual(['content', 'title']);
  });

  it('should keep no local changes for each created then deleted items', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemField(id, 'content', 'new content');
    collectionService.deleteItem(id);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(getLocalItemField(localChanges[0].itemId, 'type')).toBe(
      CollectionItemType.notebook
    );
  });

  it('should merge local changes for each deleted items into one change', () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemField(id, 'content', 'new content');
    collectionService.deleteItem(id);

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe(LocalChangeType.delete);
  });

  it(`should consider previous conflicts as added`, () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    const id2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    markAsConflict(id, id2);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe('a');
  });

  it(`should not add local changes if the value doesn't change`, () => {
    const id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    localChangesService.clear();

    GET_UPDATABLE_FIELDS('document').forEach(({ field }) => {
      const current = collectionService.getItemField<SerializableData>(
        id,
        field
      );
      collectionService.setItemField(id, field, current!);
    });

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(0);
  });

  it(`should create a local change for a value then merge for other values`, () => {
    userSettingsService.setSpaceDefaultDisplayOpts({
      sort: {
        by: 'order',
        descending: false
      },
      statsEnabled: false
    });

    let localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(2);
    let lc = getNonNotebookLocalChanges(localChanges)[0];
    expect(lc.itemId).toEqual('');
    expect(lc.on).toBe('values');
    expect(lc.change).toEqual(LocalChangeType.update);
    expect(lc.field).toBeUndefined();

    // merge others

    userSettingsService.setSpaceDefaultDisplayOpts({
      sort: {
        by: 'updated',
        descending: true
      },
      statsEnabled: false
    });

    localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(2);
    lc = getNonNotebookLocalChanges(localChanges)[0];
    expect(lc.itemId).toEqual('');
    expect(lc.on).toBe('values');
    expect(lc.change).toEqual(LocalChangeType.update);
    expect(lc.field).toBeUndefined();
  });
});
