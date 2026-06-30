import { getGlobalTrans, ROOT_COLLECTION } from '@/constants';
import { MetaField } from '@/core/db/types';
import collectionService from '@/db_to_migrate/collection.service';
import notebooksService from '@/domain/collection/notebooks.service';
import {
  allNonParentUpdatableFields,
  getLocalItemField,
  getNewValue
} from '@@/_setup/test.utils';
import { describe, expect, it, vi } from 'vitest';

describe('notebooks service', () => {
  it(`should always create a default notebook`, () => {
    expect(notebooksService.hasOneNotebook()).toBe(true);
    expect(notebooksService.getCurrentNotebook()).toBeDefined();
    const notebooks = notebooksService.getNotebooks();
    expect(notebooks).toHaveLength(1);
    expect(notebooks[0].parentId).toBe(ROOT_COLLECTION);
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
    const meta = getLocalItemField(n1, 'title_meta') as MetaField;
    expect(meta._u).toBe(getLocalItemField(n1, 'updatedAt') as number);
    expect(meta._u).toBeGreaterThan(created);
    vi.useRealTimers();
  });

  allNonParentUpdatableFields.forEach(({ field, valueType }) => {
    it(`should not update notebook modified timestamp on items update with ${field}`, () => {
      vi.useFakeTimers();
      const created = Date.now();
      const n1 = notebooksService.addNotebook('non default notebook 1')!;
      vi.advanceTimersByTime(100);

      const id1 = collectionService.addDocument(n1);
      const id2 = collectionService.addFolder(n1);
      collectionService.setItemField(id1, field, getNewValue(valueType));
      collectionService.setItemField(id2, field, getNewValue(valueType));

      expect(getLocalItemField(n1, 'updatedAt')).toBe(created);
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

    const id1 = collectionService.addDocument(n1);
    const id2 = collectionService.addFolder(n1);
    const id3 = collectionService.addDocument(id2);

    notebooksService.deleteNotebook(n1);
    expect(collectionService.itemExists(n1)).toBe(false);

    expect(collectionService.itemExists(id1)).toBe(false);
    expect(collectionService.itemExists(id2)).toBe(false);
    expect(collectionService.itemExists(id3)).toBe(false);
  });

  // TODO test local changes
});
