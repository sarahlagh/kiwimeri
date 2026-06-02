import { CollectionItem } from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import userSettingsService from '@/db/user-settings.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { searchAncestryService } from '@/search/search-ancestry.service';
import {
  fakeTimersDelay,
  GET_CONTENT_UPDATE_FIELDS,
  getNewValue
} from '@@/_setup/test.utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const idleTime = 50;

describe('collection history service', () => {
  beforeEach(() => {
    historyService['enabled'] = true;
    vi.useFakeTimers();
    searchAncestryService.start(DEFAULT_SPACE_ID);
    userSettingsService.setHistoryIdleTime(idleTime);
  });
  afterEach(() => {
    vi.useRealTimers();
    space.delValue('maxHistoryPerDoc');
    searchAncestryService.stop();
  });

  describe(`operations on a document`, () => {
    GET_CONTENT_UPDATE_FIELDS('document').forEach(({ field, valueType }) => {
      it(`should add a document version on ${field} change`, () => {
        const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        expect(historyService.getVersions(docId)).toHaveLength(1);
        vi.advanceTimersByTime(100);

        const docUpdatedTime = Date.now();
        const newValue = getNewValue(valueType);
        collectionService.setItemField(docId, field, newValue);
        const rowBefore = space.getRow('collection', docId);
        vi.advanceTimersByTime(100);
        const versions = historyService.getVersions(docId);
        expect(versions).toHaveLength(2);

        expect(versions[0].createdAt).toBe(docUpdatedTime + idleTime);
        expect(versions[0].snapshotJson.updated).toBe(docUpdatedTime);
        expect(versions[0].itemId).toBe(docId);
        const versionData = versions[0].snapshotJson;
        expect(versionData).toEqual({
          parent: rowBefore.parent,
          parent_meta: rowBefore.parent_meta,
          title: rowBefore.title,
          title_meta: rowBefore.title_meta,
          content_meta: rowBefore.content_meta,
          tags: rowBefore.tags,
          tags_meta: rowBefore.tags_meta,
          deleted: rowBefore.deleted,
          deleted_meta: rowBefore.deleted_meta,
          display_opts: rowBefore.display_opts,
          display_opts_meta: rowBefore.display_opts_meta,
          order: rowBefore.order,
          order_meta: rowBefore.order_meta,
          created: rowBefore.created,
          updated: rowBefore.updated
        });
        if (field !== 'content') {
          expect(versionData[field]).toBe(newValue);
          expect(space.getRowCount('history_content')).toBe(1);
        } else {
          expect(versions[0].content).toBe(newValue);
          expect(space.getRowCount('history_content')).toBe(2);
        }
      });
    });

    it(`should debounce changes`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);

      collectionService.setItemTitle(docId, 'new title 1');
      collectionService.setItemTitle(docId, 'new title 2');
      collectionService.setItemTitle(docId, 'new title 3');

      vi.advanceTimersByTime(100);
      const versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
    });

    it(`should debounce changes 2`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);

      userSettingsService.setHistoryIdleTime(30);

      collectionService.setItemTitle(docId, 'new title 1');
      vi.advanceTimersByTime(10);

      collectionService.setItemTitle(docId, 'new title 2');
      vi.advanceTimersByTime(10);

      collectionService.setItemTitle(docId, 'new title 3');
      vi.advanceTimersByTime(10);
      // no new version triggered yet
      expect(historyService.getVersions(docId)).toHaveLength(1);

      vi.advanceTimersByTime(10);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(20);
      expect(historyService.getVersions(docId)).toHaveLength(2);
    });

    it(`should flush a new version on continuous writing after > maxInterval`, () => {
      userSettingsService.setHistoryIdleTime(30);
      userSettingsService.setHistoryMaxInterval(100);
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(10);

      for (let i = 0; i < 9; i++) {
        collectionService.setItemTitle(docId, `new title ${i}`);
        vi.advanceTimersByTime(10);
      }
      // no new version triggered yet
      expect(historyService.getVersions(docId)).toHaveLength(1);

      collectionService.setItemTitle(docId, `new title 10`);
      vi.advanceTimersByTime(10); // we've reached max interval (100) at this point

      // version triggered due to max interval
      expect(historyService.getVersions(docId)).toHaveLength(2);

      // start of new session
      collectionService.setItemTitle(docId, `new title 11`);
      expect(historyService.getVersions(docId)).toHaveLength(2);
    });

    it(`should not flush a new version on first time after > maxInterval`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);
      userSettingsService.setHistoryIdleTime(30);
      userSettingsService.setHistoryMaxInterval(100);

      vi.advanceTimersByTime(200);
      collectionService.setItemTitle(docId, `new title 1`);
      expect(historyService.getVersions(docId)).toHaveLength(1); // new version not flushed but pending
      vi.advanceTimersByTime(30);
      expect(historyService.getVersions(docId)).toHaveLength(2); // flushed
    });

    it(`should restore to a previous version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);
      const itemBefore = space.getRow('collection', docId) as CollectionItem;

      const newValue = getNewValue('string') as string;
      collectionService.setItemTitle(docId, newValue);
      vi.advanceTimersByTime(100);
      let versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      expect(versions[0].snapshotJson.title).toBe(newValue);
      expect(versions[1].snapshotJson.title).toBe(itemBefore.title);
      localChangesService.clear();

      historyService.restoreDocumentVersion(docId, versions[1].id!);
      const restoredItem = space.getRow('collection', docId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(3);
      expect(versions[0].snapshotJson.title).toBe(itemBefore.title);
      expect(versions[1].snapshotJson.title).toBe(newValue);
      expect(versions[2].snapshotJson.title).toBe(itemBefore.title);

      const lc = localChangesService.getLocalChanges();
      expect(lc).toHaveLength(1);
      expect(lc[0].change).toBe(LocalChangeType.update);
      expect(lc[0].itemId).toBe(docId);
      expect(lc[0].field).toBe('title');
    });

    it(`should version unsaved changes when restoring to a previous version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);
      const itemBefore = space.getRow('collection', docId) as CollectionItem;

      // new change, creates version 1
      const newValue1 = getNewValue('string') as string;
      collectionService.setItemTitle(docId, newValue1);
      vi.advanceTimersByTime(100);
      let versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      expect(versions[0].snapshotJson.title).toBe(newValue1);
      expect(versions[1].snapshotJson.title).toBe(itemBefore.title);

      // new change, not yet in version
      const newValue2 = getNewValue('string') as string;
      collectionService.setItemTitle(docId, newValue2);
      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      vi.advanceTimersByTime(10);

      historyService.restoreDocumentVersion(docId, versions[1].id!);
      const restoredItem = space.getRow('collection', docId) as CollectionItem;
      expect(restoredItem.title).toEqual(itemBefore.title);

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(4);
      expect(versions[0].snapshotJson.title).toBe(itemBefore.title);
      expect(versions[0].snapshotJson.updated).toBe(itemBefore.updated + 210);
      expect(versions[1].snapshotJson.title).toBe(newValue2);
      expect(versions[1].snapshotJson.updated).toBe(itemBefore.updated + 200);
      expect(versions[2].snapshotJson.title).toBe(newValue1);
      expect(versions[2].snapshotJson.updated).toBe(itemBefore.updated + 100);
      expect(versions[3].snapshotJson.title).toBe(itemBefore.title);
      expect(versions[3].snapshotJson.updated).toBe(itemBefore.updated);
    });

    it(`should do nothing for a document order change`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);

      collectionService.setItemField(docId, 'order', 7);
      vi.advanceTimersByTime(100);
      const versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(1);
    });

    it(`should create a delete version on a hard delete`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);
      collectionService.setItemTitle(docId, 'new title');
      vi.advanceTimersByTime(100);

      collectionService.deleteItem(docId);
      const versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(3);
      expect(versions[0].op).toBe('deleted');
    });

    it(`should not create new version if change debounced but hard delete in between`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      vi.advanceTimersByTime(100);
      collectionService.setItemTitle(docId, 'new title');
      vi.advanceTimersByTime(10);

      collectionService.deleteItem(docId);
      vi.advanceTimersByTime(100);
      const versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      expect(versions[0].op).toBe('deleted');
      expect(versions[0].snapshotJson.title).toBe('new title');
    });

    it(`should create a new version after a conflict resolution by update`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);

      const item = space.getRow('collection', docId);
      // create conflict
      const ts = Date.now();
      const conflictId = space.addRow('collection', {
        ...{ ...item, id: undefined },
        conflict: docId,
        created: ts,
        updated: ts
      })!;
      expect(collectionService.isItemConflict(conflictId)).toBe(true);
      expect(historyService.getVersions(conflictId)).toHaveLength(0);
      vi.advanceTimersByTime(100);

      collectionService.setItemTitle(conflictId, 'conflict resolution'); // resolve conflict
      vi.advanceTimersByTime(100);

      expect(collectionService.isItemConflict(conflictId)).toBe(false);

      expect(historyService.getVersions(docId)).toHaveLength(1);
      expect(historyService.getVersions(conflictId)).toHaveLength(1);
      expect(historyService.getLatestVersion(conflictId).op).toBe('snapshot');
      expect(
        historyService.getLatestVersion(conflictId).snapshotJson.title
      ).toBe('conflict resolution');
    });

    it(`should create a new version after a conflict resolution by delete`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);

      const item = space.getRow('collection', docId);
      // create conflict
      const ts = Date.now();
      const conflictId = space.addRow('collection', {
        ...{ ...item, id: undefined },
        conflict: docId,
        created: ts,
        updated: ts
      })!;
      expect(collectionService.isItemConflict(conflictId)).toBe(true);
      expect(historyService.getVersions(conflictId)).toHaveLength(0);
      vi.advanceTimersByTime(100);

      collectionService.deleteItem(conflictId); // resolve conflict
      vi.advanceTimersByTime(100);

      expect(collectionService.isItemConflict(conflictId)).toBe(false);

      expect(historyService.getVersions(docId)).toHaveLength(1);
      expect(historyService.getVersions(conflictId)).toHaveLength(0);
    });
  });

  it(`getLatestVersion method`, () => {
    const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    vi.advanceTimersByTime(100);
    collectionService.addPage(docId);
    vi.advanceTimersByTime(100);
    collectionService.addPage(docId);
    vi.advanceTimersByTime(100);

    const docVersions = historyService.getVersions(docId);
    const latestVersions = historyService.getLatestVersion(docId);
    expect(docVersions[0].id).toBe(latestVersions.id);
  });

  it(`should gc versions and content`, () => {
    space.setValue('maxHistoryPerDoc', 3);
    const doc1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.setItemField(doc1, 'content', getNewValue('lex'));
    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.setItemField(doc1, 'title', getNewValue('string'));
    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.setItemField(doc1, 'content', getNewValue('lex'));
    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.setItemField(doc1, 'title', getNewValue('string'));
    vi.advanceTimersByTime(fakeTimersDelay);
    expect(historyService.getVersions(doc1)).toHaveLength(5);
    expect(space.getRowCount('history_content')).toBe(3);

    historyService.gc();
    expect(historyService.getVersions(doc1)).toHaveLength(3);
    expect(space.getRowCount('history_content')).toBe(2);

    // one more title version - one content is removed
    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.setItemField(doc1, 'title', getNewValue('string'));
    vi.advanceTimersByTime(fakeTimersDelay);

    historyService.gc();
    expect(historyService.getVersions(doc1)).toHaveLength(3);
    expect(space.getRowCount('history_content')).toBe(1);
  });
});
