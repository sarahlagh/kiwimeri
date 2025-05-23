import { CollectionItemType } from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/localChanges.service';
import notebooksService from '@/db/notebooks.service';
import { LocalChange, LocalChangeType } from '@/db/types/store-types';
import { it } from 'vitest';
import { getLocalItemField, markAsConflict } from '../../setup/test.utils';

const getNonNotebookLocalChanges = (localChanges: LocalChange[]) =>
  localChanges.filter(lc => lc.item !== notebooksService.getCurrentNotebook());

describe('local changes service', () => {
  it('should only have notebook local changes by default', () => {
    expect(localChangesService.getLocalChanges()).toHaveLength(1);
    const lc = localChangesService.getLocalChanges()[0];
    expect(lc.change).toBe(LocalChangeType.add);
    expect(getLocalItemField(lc.item, 'type')).toBe(
      CollectionItemType.notebook
    );
  });

  it('should create a local change for each created items', () => {
    const createdItems: string[] = [];
    createdItems.push(collectionService.addDocument(ROOT_FOLDER));
    createdItems.push(collectionService.addFolder(ROOT_FOLDER));
    createdItems.push(collectionService.addDocument(ROOT_FOLDER));
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(4);
    expect(getNonNotebookLocalChanges(localChanges).map(l => l.item)).toEqual(
      createdItems.toReversed()
    );
  });

  it('should merge local changes for each created then updated items into one change', () => {
    const id = collectionService.addDocument(ROOT_FOLDER);
    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemContent(id, 'new content');
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(2);
    const lc = getNonNotebookLocalChanges(localChanges)[0];
    expect(lc.item).toEqual(id);
    expect(lc.change).toEqual('a');
    expect(lc.field).toBeUndefined();
  });

  it('should merge local changes for each updated items into one change per field', () => {
    const id = collectionService.addDocument(ROOT_FOLDER);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemTitle(id, 'new title 3');
    collectionService.setItemContent(id, 'new content');
    const localChanges = localChangesService.getLocalChanges();

    expect(localChanges).toHaveLength(2);
    expect(localChanges.map(l => l.item)).toEqual([id, id]);
    expect(localChanges.map(l => l.change)).toEqual(['u', 'u']);
    expect(localChanges.map(l => l.field)).toEqual(['content', 'title']);
  });

  it('should keep no local changes for each created then deleted items', () => {
    const id = collectionService.addDocument(ROOT_FOLDER);
    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemContent(id, 'new content');
    collectionService.deleteItem(id);
    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(getLocalItemField(localChanges[0].item, 'type')).toBe(
      CollectionItemType.notebook
    );
  });

  it('should merge local changes for each deleted items into one change', () => {
    const id = collectionService.addDocument(ROOT_FOLDER);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');
    collectionService.setItemTitle(id, 'new title 2');
    collectionService.setItemContent(id, 'new content');
    collectionService.deleteItem(id);

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe(LocalChangeType.delete);
  });

  it(`should consider previous conflicts as added`, () => {
    const id = collectionService.addDocument(ROOT_FOLDER);
    const id2 = collectionService.addDocument(ROOT_FOLDER);
    markAsConflict(id, id2);
    localChangesService.clear();

    collectionService.setItemTitle(id, 'new title');

    const localChanges = localChangesService.getLocalChanges();
    expect(localChanges).toHaveLength(1);
    expect(localChanges[0].change).toBe('a');
  });
});
