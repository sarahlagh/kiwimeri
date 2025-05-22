import { getGlobalTrans } from '@/config';
import { ROOT_FOLDER, ROOT_NOTEBOOK } from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import {
  getLocalItemField,
  NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS
} from '@/vitest/setup/test.utils';
import { it, vi } from 'vitest';

describe('notebooks service', () => {
  it(`should always create a default notebook`, () => {
    expect(notebooksService.hasOneNotebook()).toBe(true);
    expect(notebooksService.getCurrentNotebook()).toBeDefined();
    const notebooks = notebooksService.getNotebooks();
    expect(notebooks).toHaveLength(1);
    expect(notebooks[0].parent).toBe(ROOT_NOTEBOOK);
    expect(notebooks[0].title).toBe(getGlobalTrans().defaultNotebookName);
  });

  it(`should add more notebooks`, () => {
    const n1 = notebooksService.addNotebook('non default notebook 1');
    const n2 = notebooksService.addNotebook('non default notebook 2', n1);
    expect(notebooksService.getNotebooks()).toHaveLength(2);
    expect(notebooksService.getNotebooks(n1)).toHaveLength(1);
    expect(collectionService.itemExists(n1!));
    expect(collectionService.itemExists(n2!));
  });

  it(`should update notebook title`, () => {
    vi.useFakeTimers();
    const created = Date.now();
    const n1 = notebooksService.addNotebook('non default notebook 1')!;

    vi.advanceTimersByTime(100);
    notebooksService.setNotebookTitle(n1, 'non default title');

    expect(collectionService.getItemField(n1, 'title')).toBe(
      'non default title'
    );
    const meta = JSON.parse(getLocalItemField(n1, 'title_meta') as string);
    expect(meta.updated).toBe(getLocalItemField(n1, 'updated') as number);
    expect(meta.updated).toBeGreaterThan(created);
    vi.useRealTimers();
  });

  it(`should create items inside current notebook`, () => {
    const id0 = collectionService.addDocument(ROOT_FOLDER);
    expect(collectionService.getItemField(id0, 'notebook')).not.toBe(
      ROOT_NOTEBOOK
    );
    expect(collectionService.getItemField(id0, 'notebook')).toBe(
      notebooksService.getCurrentNotebook()
    );

    const n1 = notebooksService.addNotebook('non default notebook 1');
    notebooksService.setCurrentNotebook(n1!);

    const id1 = collectionService.addDocument(ROOT_FOLDER);
    const id2 = collectionService.addFolder(ROOT_FOLDER);
    const id3 = collectionService.addDocument(id2);
    expect(collectionService.getItemField(id1, 'notebook')).toBe(n1);
    expect(collectionService.getItemField(id2, 'notebook')).toBe(n1);
    expect(collectionService.getItemField(id3, 'notebook')).toBe(n1);
  });

  NON_PARENT_NON_NOTEBOOK_UPDATABLE_FIELDS.forEach(({ field }) => {
    it(`should not update notebook modified timestamp on items update with ${field}`, () => {
      vi.useFakeTimers();
      const created = Date.now();
      const n1 = notebooksService.addNotebook('non default notebook 1')!;
      notebooksService.setCurrentNotebook(n1);
      vi.advanceTimersByTime(100);

      const id1 = collectionService.addDocument(ROOT_FOLDER);
      const id2 = collectionService.addFolder(ROOT_FOLDER);
      collectionService.setItemField(id1, field, 'newValue');
      collectionService.setItemField(id2, field, 'newValue');

      expect(getLocalItemField(n1, 'updated')).toBe(created);
      vi.useRealTimers();
    });
  });

  it(`should delete empty notebooks`, () => {
    const n1 = notebooksService.addNotebook('non default notebook 1')!;
    expect(collectionService.itemExists(n1)).toBe(true);

    notebooksService.deleteNotebook(n1);
    expect(collectionService.itemExists(n1)).toBe(false);
  });

  it(`should delete non-empty notebooks`, () => {
    const n1 = notebooksService.addNotebook('non default notebook 1')!;
    expect(collectionService.itemExists(n1)).toBe(true);
    notebooksService.setCurrentNotebook(n1);

    const id1 = collectionService.addDocument(ROOT_FOLDER);
    const id2 = collectionService.addFolder(ROOT_FOLDER);
    const id3 = collectionService.addDocument(id2);

    expect(collectionService.getItemField(id1, 'notebook')).toBe(n1);

    notebooksService.deleteNotebook(n1);
    expect(collectionService.itemExists(n1)).toBe(false);

    expect(collectionService.itemExists(id1)).toBe(false);
    expect(collectionService.itemExists(id2)).toBe(false);
    expect(collectionService.itemExists(id3)).toBe(false);
  });

  // TODO test local changes
});
