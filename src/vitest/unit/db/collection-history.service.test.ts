import {
  CollectionItem,
  CollectionItemSortType,
  CollectionItemUpdatableFieldEnum,
  CollectionItemVersion,
  SortableCollectionItem
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService, { initialContent } from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import storageService from '@/db/storage.service';
import { defaultOrder } from '@/db/types/space-types';
import { LocalChangeType } from '@/db/types/store-types';
import userSettingsService from '@/db/user-settings.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { renderHook } from '@testing-library/react';
import { it, vi } from 'vitest';
import {
  fakeTimersDelay,
  GET_CONTENT_UPDATE_FIELDS,
  getNewContent,
  getNewValue,
  ValueType
} from '../../setup/test.utils';

describe('collection history service', () => {
  beforeEach(() => {
    historyService['enabled'] = true;
    vi.useFakeTimers();
    searchAncestryService.start(DEFAULT_SPACE_ID);
    historyService.start(DEFAULT_SPACE_ID);
    userSettingsService.setHistoryIdleTime(50);
  });
  afterEach(() => {
    vi.useRealTimers();
    storageService.getSpace().delValue('maxHistoryPerDoc');
    searchAncestryService.stop();
  });

  describe(`operations on a document`, () => {
    GET_CONTENT_UPDATE_FIELDS('document').forEach(({ field, valueType }) => {
      it(`should add a document version on ${field} change`, () => {
        const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        expect(historyService.getVersions(docId)).toHaveLength(1);
        vi.advanceTimersByTime(100);

        const versionCreatedTime = Date.now();
        const newValue = getNewValue(valueType);
        collectionService.setItemField(docId, field, newValue);
        const rowBefore = storageService.getSpace().getRow('collection', docId);
        vi.advanceTimersByTime(100);
        const versions = historyService.getVersions(docId);
        expect(versions).toHaveLength(2);
        expect(versions[0].createdAt).toBe(versionCreatedTime);
        expect(versions[0].itemId).toBe(docId);
        const versionData = versions[0].snapshotJson as any;
        expect(versionData).toEqual({
          title: rowBefore.title,
          title_meta: rowBefore.title_meta,
          content_meta: rowBefore.content_meta,
          tags: rowBefore.tags,
          tags_meta: rowBefore.tags_meta,
          deleted: rowBefore.deleted,
          deleted_meta: rowBefore.deleted_meta,
          display_opts: rowBefore.display_opts,
          display_opts_meta: rowBefore.display_opts_meta,
          created: rowBefore.created,
          updated: rowBefore.updated
        });
        if (field !== 'content') {
          expect(versionData[field]).toBe(newValue);
          expect(storageService.getSpace().getRowCount('history_content')).toBe(
            1
          );
        } else {
          expect(versions[0].content).toBe(newValue);
          expect(storageService.getSpace().getRowCount('history_content')).toBe(
            2
          );
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

    it(`should restore to a previous version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);
      const itemBefore = storageService
        .getSpace()
        .getRow('collection', docId) as CollectionItem;

      const newValue = getNewValue('string') as string;
      collectionService.setItemTitle(docId, newValue);
      vi.advanceTimersByTime(100);
      let versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      expect(versions[0].snapshotJson.title).toBe(newValue);
      expect(versions[1].snapshotJson.title).toBe(itemBefore.title);
      localChangesService.clear();

      historyService.restoreDocumentVersion(docId, versions[1].id!);
      const restoredItem = storageService
        .getSpace()
        .getRow('collection', docId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(3);
      expect(versions[0].snapshotJson.title).toBe(itemBefore.title);
      expect(versions[1].snapshotJson.title).toBe(newValue);
      expect(versions[2].snapshotJson.title).toBe(itemBefore.title);

      const lc = localChangesService.getLocalChanges();
      expect(lc).toHaveLength(1);
      expect(lc[0].change).toBe(LocalChangeType.update);
      expect(lc[0].item).toBe(docId);
      expect(lc[0].field).toBeUndefined();
    });

    it(`should version unsaved changes when restoring to a previous version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(1);
      vi.advanceTimersByTime(100);
      const itemBefore = storageService
        .getSpace()
        .getRow('collection', docId) as CollectionItem;

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
      const restoredItem = storageService
        .getSpace()
        .getRow('collection', docId) as CollectionItem;
      expect(restoredItem.title).toEqual(itemBefore.title);

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(4);
      expect(versions[0].snapshotJson.title).toBe(itemBefore.title);
      expect(versions[0].createdAt).toBe(itemBefore.updated + 210);
      expect(versions[1].snapshotJson.title).toBe(newValue2);
      expect(versions[1].createdAt).toBe(itemBefore.updated + 200);
      expect(versions[2].snapshotJson.title).toBe(newValue1);
      expect(versions[2].createdAt).toBe(itemBefore.updated + 100);
      expect(versions[3].snapshotJson.title).toBe(itemBefore.title);
      expect(versions[3].createdAt).toBe(itemBefore.updated);
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

    it(`should also restore all pages when restoring a document`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID); // 5
      const page1 = collectionService.addPage(docId); // 4
      const page2 = collectionService.addPage(docId); // 3
      vi.advanceTimersByTime(100);
      collectionService.deleteItem(page2); // 2
      const page3 = collectionService.addPage(docId); // 1
      vi.advanceTimersByTime(100);
      const newOrder = defaultOrder - 100;
      collectionService.setItemField(page1, 'order', newOrder); // 0
      vi.advanceTimersByTime(100);

      let versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(6);

      historyService.restoreDocumentVersion(docId, versions[3].id);
      vi.advanceTimersByTime(100);

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(7);

      // should have updated page1
      const restoredOrder = defaultOrder;
      const restoredPage1 = collectionService.getItem(page1);
      expect(restoredPage1.order).toBe(restoredOrder);

      // should have recreated page2
      const restoredPage2 = collectionService.getItem(page2);
      expect(restoredPage2).toBeDefined();

      // should have deleted page3
      expect(collectionService.itemExists(page3)).toBe(false);

      // should have created new versions for the pages
      const latestVersion1 = historyService.getLatestVersion(page1);
      const latestVersion2 = historyService.getLatestVersion(page2);
      expect(versions[0].pageVersionsArrayJson).toEqual([
        {
          id: latestVersion1.id,
          createdAt: latestVersion1.createdAt,
          itemId: latestVersion1.itemId
        },
        {
          id: latestVersion2.id,
          createdAt: latestVersion2.createdAt,
          itemId: latestVersion2.itemId
        }
      ]);

      // assert that latest version is correct
      const page1VersionData = storageService
        .getSpace()
        .getCell('history', latestVersion1.id, 'snapshotJson');
      expect(JSON.parse(page1VersionData as string).order).toBe(restoredOrder);

      // restore to a version where page3 re-exists (undo)
      historyService.restoreDocumentVersion(docId, versions[1].id);
      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(8);
      expect(collectionService.itemExists(page3)).toBe(true);
      expect(collectionService.getItem(page1).order).toBe(newOrder);
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

      const space = storageService.getSpace();
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

      const space = storageService.getSpace();
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

  describe(`operations on a page`, () => {
    [
      ...GET_CONTENT_UPDATE_FIELDS('page'),
      {
        field: 'order' as CollectionItemUpdatableFieldEnum,
        valueType: 'number' as ValueType
      }
    ].forEach(({ field, valueType }) => {
      it(`should add a page version on ${field} change`, () => {
        const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        const pageId = collectionService.addPage(docId);
        expect(historyService.getVersions(pageId)).toHaveLength(1);
        vi.advanceTimersByTime(100);

        const versionCreatedTime = Date.now();
        const newValue = getNewValue(valueType);
        collectionService.setItemField(pageId, field, newValue);
        const rowBefore = storageService
          .getSpace()
          .getRow('collection', pageId);
        vi.advanceTimersByTime(100);
        const versions = historyService.getVersions(pageId);
        expect(versions).toHaveLength(2);
        expect(versions[0].createdAt).toBe(versionCreatedTime);
        expect(versions[0].itemId).toBe(pageId);
        const versionData = versions[0].snapshotJson as any;
        expect(versionData).toEqual({
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
          expect(storageService.getSpace().getRowCount('history_content')).toBe(
            2
          );
        } else {
          expect(versions[0].content).toBe(newValue);
          expect(storageService.getSpace().getRowCount('history_content')).toBe(
            3
          );
        }
        const docVersions = historyService.getVersions(docId);
        expect(docVersions).toHaveLength(3);
        expect(docVersions[0].pageVersionsArrayJson).toHaveLength(1);
        expect(docVersions[0].pageVersionsArrayJson).toEqual([
          {
            id: versions[0].id,
            createdAt: versions[0].createdAt,
            itemId: pageId
          }
        ]);
      });
    });

    it(`should debounce changes`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID); // 4
      const page1 = collectionService.addPage(docId); // 3
      vi.advanceTimersByTime(10);

      collectionService.setItemField(docId, 'title', 'title1'); // 2
      collectionService.setItemField(docId, 'title', 'title2'); // 2
      collectionService.setItemField(docId, 'title', 'title3'); // 2
      vi.advanceTimersByTime(10);

      // 1
      collectionService.setItemField(
        page1,
        'content',
        getNewContent('content1')
      );
      // 1
      collectionService.setItemField(
        page1,
        'content',
        getNewContent('content2')
      );
      vi.advanceTimersByTime(10);

      collectionService.addPage(docId); // 0 - addPage triggers a saveNow()

      const versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(5);
      expect(versions[0].snapshotJson.title).toBe('title3');
      expect(versions[0].pageVersionsArrayJson).toHaveLength(2);
      expect(historyService.getPagesForVersion(versions[0].id)[0].preview).toBe(
        'content2'
      );

      expect(versions[1].snapshotJson.title).toBe('title3');
      expect(versions[1].pageVersionsArrayJson).toHaveLength(1);
      expect(historyService.getPagesForVersion(versions[1].id)[0].preview).toBe(
        'content2'
      );

      expect(versions[2].snapshotJson.title).toBe('title3');
      expect(versions[2].pageVersionsArrayJson).toHaveLength(1);
      expect(historyService.getPagesForVersion(versions[2].id)[0].preview).toBe(
        ''
      );

      expect(versions[3].snapshotJson.title).toBe(getGlobalTrans().newDocTitle);
      expect(versions[3].pageVersionsArrayJson).toHaveLength(1);

      expect(versions[4].snapshotJson.title).toBe(getGlobalTrans().newDocTitle);
      expect(versions[4].pageVersionsArrayJson).not.toBeDefined();
    });

    it(`should version a page and its document lite`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      vi.advanceTimersByTime(100);
      const pageId1 = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.setItemTitle(docId, 'new title');
      vi.advanceTimersByTime(100);
      collectionService.setItemField(pageId1, 'content', getNewValue('lex'));
      vi.advanceTimersByTime(100);

      const space = storageService.getSpace();
      expect(space.getRowCount('history')).toBe(6);
      const docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(4);

      const page1Versions = historyService.getVersions(pageId1);
      expect(docVersions[0].pageVersionsArrayJson).toEqual([
        {
          id: page1Versions[0].id,
          createdAt: page1Versions[0].createdAt,
          itemId: page1Versions[0].itemId
        }
      ]);
      expect(page1Versions).toHaveLength(2);

      const table = storageService.getSpace().getTable('history');

      // change page1 content
      expect(table[docVersions[0].id!].pageVersionsArrayJson).toBeDefined();
      expect(
        JSON.parse(table[docVersions[0].id!].pageVersionsArrayJson!.toString())
      ).toHaveLength(1);
      let pages = historyService.getPagesForVersion(docVersions[0].id!);
      expect(pages).toHaveLength(1);
      expect(pages.map(p => p.itemId)).toEqual([pageId1]);
      expect(pages.map(p => p.id)).toEqual([page1Versions[0].id]);
      expect(pages.map(p => p.preview)).not.toHaveLength(0);

      // change doc title
      expect(table[docVersions[1].id!].pageVersionsArrayJson).toBeDefined();
      expect(
        JSON.parse(table[docVersions[1].id!].pageVersionsArrayJson!.toString())
      ).toHaveLength(1);
      pages = historyService.getPagesForVersion(docVersions[1].id!);
      expect(pages).toHaveLength(1);
      expect(pages.map(p => p.itemId)).toEqual([pageId1]);
      expect(pages.map(p => p.id)).toEqual([page1Versions[1].id]);

      // add page1
      pages = historyService.getPagesForVersion(docVersions[2].id!);
      expect(pages).toHaveLength(1);
      expect(pages.map(p => p.itemId)).toEqual([pageId1]);
      expect(pages.map(p => p.id)).toEqual([page1Versions[1].id]);

      // initial doc creation
      expect(
        historyService.getPagesForVersion(docVersions[3].id!)
      ).toHaveLength(0);
    });

    it(`should version a page and its document`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      vi.advanceTimersByTime(100);
      const pageId1 = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      const pageId2 = collectionService.addPage(docId);
      vi.advanceTimersByTime(100);
      collectionService.setItemTitle(docId, 'new title');
      vi.advanceTimersByTime(100);
      collectionService.setItemField(pageId1, 'content', getNewValue('lex'));
      vi.advanceTimersByTime(100);

      const space = storageService.getSpace();
      expect(space.getRowCount('history')).toBe(8);
      const docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(5);

      const page1Versions = historyService.getVersions(pageId1);
      const page2Versions = historyService.getVersions(pageId2);

      expect(docVersions[0].pageVersionsArrayJson).toEqual([
        {
          id: page1Versions[0].id,
          createdAt: page1Versions[0].createdAt,
          itemId: page1Versions[0].itemId
        },
        {
          id: page2Versions[0].id,
          createdAt: page2Versions[0].createdAt,
          itemId: page2Versions[0].itemId
        }
      ]);

      expect(page1Versions).toHaveLength(2);
      expect(page2Versions).toHaveLength(1);

      for (let i = 0; i < docVersions.length; i++) {
        console.log(i, historyService.getPagesForVersion(docVersions[i].id!));
      }

      // change page1 content
      let pages = historyService.getPagesForVersion(docVersions[0].id!);
      expect(pages).toHaveLength(2);
      expect(pages.map(p => p.itemId)).toEqual([pageId1, pageId2]);
      expect(pages.map(p => p.id)).toEqual([
        page1Versions[0].id,
        page2Versions[0].id
      ]);

      // change doc title
      pages = historyService.getPagesForVersion(docVersions[1].id!);
      expect(pages).toHaveLength(2);
      expect(pages.map(p => p.itemId)).toEqual([pageId1, pageId2]);
      expect(pages.map(p => p.id)).toEqual([
        page1Versions[1].id,
        page2Versions[0].id
      ]);

      // add page2
      pages = historyService.getPagesForVersion(docVersions[2].id!);
      expect(pages).toHaveLength(2);
      expect(pages.map(p => p.itemId)).toEqual([pageId1, pageId2]);
      expect(pages.map(p => p.id)).toEqual([
        page1Versions[1].id,
        page2Versions[0].id
      ]);

      // add page1
      pages = historyService.getPagesForVersion(docVersions[3].id!);
      expect(pages).toHaveLength(1);
      expect(pages.map(p => p.itemId)).toEqual([pageId1]);
      expect(pages.map(p => p.id)).toEqual([page1Versions[1].id]);

      // initial doc creation
      expect(
        historyService.getPagesForVersion(docVersions[4].id!)
      ).toHaveLength(0);
    });

    it(`should restore a single page and create new document version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const pageId = collectionService.addPage(docId);
      const itemBefore = storageService
        .getSpace()
        .getRow('collection', pageId) as CollectionItem;
      vi.advanceTimersByTime(100);

      const newValue = getNewValue('lex') as string;
      collectionService.setItemField(pageId, 'content', newValue);
      vi.advanceTimersByTime(100);
      let docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(3);
      let versions = historyService.getVersions(pageId);
      expect(versions).toHaveLength(2);

      localChangesService.clear();
      vi.advanceTimersByTime(100);
      historyService.restorePageVersion(pageId, versions[1].id!);

      docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(4);
      versions = historyService.getVersions(pageId);
      expect(versions).toHaveLength(3);

      const pageVersions = historyService.getPagesForVersion(
        docVersions[0].id!
      );
      expect(pageVersions).toHaveLength(1);
      const pageVersion = pageVersions[0];
      expect(pageVersion.itemId).toBe(pageId);
      expect(pageVersion.content).toBe(initialContent());
      expect(pageVersion.preview).toBe('');

      const restoredItem = storageService
        .getSpace()
        .getRow('collection', pageId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });

      const lc = localChangesService.getLocalChanges();
      expect(lc).toHaveLength(1);
      expect(lc[0].change).toBe(LocalChangeType.update);
      expect(lc[0].item).toBe(pageId);
      expect(lc[0].field).toBeUndefined();
    });

    it(`should version unsaved changes when restoring to a previous version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      vi.advanceTimersByTime(100);
      const pageId = collectionService.addPage(docId);
      const itemBefore = storageService
        .getSpace()
        .getRow('collection', pageId) as CollectionItem;
      vi.advanceTimersByTime(100);

      // new change, creates version 1
      const newValue1 = getNewValue('lex') as string;
      collectionService.setItemField(pageId, 'content', newValue1);
      vi.advanceTimersByTime(100);
      let docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(3);
      let versions = historyService.getVersions(pageId);
      expect(versions).toHaveLength(2);

      // new change, not yet in version
      const newValue2 = getNewValue('lex') as string;
      collectionService.setItemField(pageId, 'content', newValue2);
      vi.advanceTimersByTime(10);

      // restore
      historyService.restorePageVersion(pageId, versions[1].id!);

      docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(5);
      versions = historyService.getVersions(pageId);
      expect(versions).toHaveLength(4);

      let pageVersions = historyService.getPagesForVersion(docVersions[0].id!);
      expect(pageVersions).toHaveLength(1);
      let pageVersion = pageVersions[0];
      expect(pageVersion.itemId).toBe(pageId);
      expect(pageVersion.content).toBe(initialContent());
      expect(pageVersion.preview).toBe('');

      pageVersions = historyService.getPagesForVersion(docVersions[1].id!);
      expect(pageVersions).toHaveLength(1);
      pageVersion = pageVersions[0];
      expect(pageVersion.itemId).toBe(pageId);
      expect(pageVersion.content).toBe(newValue2);

      const restoredItem = storageService
        .getSpace()
        .getRow('collection', pageId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });
    });

    it(`should add a single document version for a page reorder`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const pageId1 = collectionService.addPage(docId);
      const pageId2 = collectionService.addPage(docId);
      expect(historyService.getVersions(docId)).toHaveLength(3);
      expect(historyService.getVersions(pageId1)).toHaveLength(1);
      expect(historyService.getVersions(pageId2)).toHaveLength(1);

      vi.advanceTimersByTime(100);
      const page1 = collectionService.getItem(
        pageId1
      ) as SortableCollectionItem;
      const page2 = collectionService.getItem(
        pageId2
      ) as SortableCollectionItem;
      collectionService.reorderItems([page1, page2], 0, 1, docId);
      vi.advanceTimersByTime(100);

      const docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(4);
      const page1Versions = historyService.getVersions(pageId1);
      expect(page1Versions).toHaveLength(2);
      const page2Versions = historyService.getVersions(pageId2);
      expect(page2Versions).toHaveLength(2);

      const versionedPages = historyService.getPagesForVersion(
        docVersions[0].id!
      );
      expect(versionedPages).toHaveLength(2);
      expect(versionedPages[0].itemId).toBe(pageId1);
      expect(versionedPages[0].snapshotJson.order).toBe(1);
      expect(versionedPages[1].itemId).toBe(pageId2);
      expect(versionedPages[1].snapshotJson.order).toBe(0);
    });

    describe('fetch pages sort order', () => {
      it(`should respect manual pages sort order for a document version`, () => {
        const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        const pageId1 = collectionService.addPage(docId);
        const pageId2 = collectionService.addPage(docId);

        // set manual order
        collectionService.setItemDisplayOpts(docId, {
          sort: { by: 'order', descending: false }
        });
        vi.advanceTimersByTime(100);
        expect(historyService.getVersions(docId)).toHaveLength(4);

        const page1 = collectionService.getItem(
          pageId1
        ) as SortableCollectionItem;
        const page2 = collectionService.getItem(
          pageId2
        ) as SortableCollectionItem;
        collectionService.reorderItems([page1, page2], 0, 1, docId);
        vi.advanceTimersByTime(100);

        const docVersions = historyService.getVersions(docId);
        expect(docVersions).toHaveLength(5);

        const versionedPages = historyService.getPagesForVersion(
          docVersions[0].id!
        );
        expect(versionedPages).toHaveLength(2);
        expect(versionedPages[0].itemId).toBe(pageId2);
        expect(versionedPages[0].snapshotJson.order).toBe(0);
        expect(versionedPages[1].itemId).toBe(pageId1);
        expect(versionedPages[1].snapshotJson.order).toBe(1);
      });

      const sortBy: {
        by: CollectionItemSortType;
        descending: boolean;
        expected: string[];
      }[] = [
        { by: 'preview', descending: true, expected: ['C', 'B', 'A'] },
        { by: 'preview', descending: false, expected: ['A', 'B', 'C'] },
        { by: 'updated', descending: true, expected: ['B', 'A', 'C'] },
        { by: 'updated', descending: false, expected: ['C', 'A', 'B'] },
        { by: 'created', descending: true, expected: ['C', 'A', 'B'] },
        { by: 'created', descending: false, expected: ['B', 'A', 'C'] }
      ];
      sortBy.forEach(({ by, descending, expected }) => {
        it(`should respect (${by}, ${descending}) pages sort order for a document version`, () => {
          const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
          vi.advanceTimersByTime(100);
          const pageId1 = collectionService.addPage(docId); // B
          vi.advanceTimersByTime(100);
          const pageId2 = collectionService.addPage(docId); // A
          vi.advanceTimersByTime(100);
          const pageId3 = collectionService.addPage(docId); // C
          vi.advanceTimersByTime(100);
          collectionService.setItemField(
            pageId3,
            'content',
            getNewContent('C')
          );
          vi.advanceTimersByTime(100);
          collectionService.setItemField(
            pageId2,
            'content',
            getNewContent('A')
          );
          vi.advanceTimersByTime(100);
          collectionService.setItemField(
            pageId1,
            'content',
            getNewContent('B')
          );
          vi.advanceTimersByTime(100);

          // set order
          collectionService.setItemDisplayOpts(docId, {
            sort: { by, descending }
          });
          vi.advanceTimersByTime(100);

          const docVersions = historyService.getVersions(docId);
          const versionedPages = historyService.getPagesForVersion(
            docVersions[0].id!
          );
          expect(versionedPages.map(p => p.preview)).toEqual(expected);
        });
      });
    });

    it(`should not erase all page versions on a hard delete if document still exists`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const pageId1 = collectionService.addPage(docId);
      expect(historyService.getVersions(pageId1)).toHaveLength(1);
      vi.advanceTimersByTime(100);

      collectionService.deleteItem(pageId1);
      const docVersions = historyService.getVersions(docId);
      const pageVersions = historyService.getVersions(pageId1);
      expect(docVersions).toHaveLength(3);
      expect(pageVersions).toHaveLength(2);
      expect(pageVersions[0].op).toBe('deleted');
      expect(historyService.getPagesForVersion(docVersions[0].id)).toHaveLength(
        0
      );
    });

    it(`should create deleted versions for all pages and document versions on a document hard delete`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const pageId1 = collectionService.addPage(docId);
      const pageId2 = collectionService.addPage(docId);
      expect(historyService.getVersions(docId)).toHaveLength(3);
      vi.advanceTimersByTime(100);

      collectionService.deleteItem(docId);
      let versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(4);
      expect(versions[0].op).toBe('deleted');
      versions = historyService.getVersions(pageId1);
      expect(versions).toHaveLength(2);
      expect(versions[0].op).toBe('deleted');
      versions = historyService.getVersions(pageId2);
      expect(versions).toHaveLength(2);
      expect(versions[0].op).toBe('deleted');
    });

    // TODO when debouncing both document change and page change, or two different page changes on same doc,
    // should only create one document version at the end
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

  it(`useDocumentVersionedPages hook`, () => {
    let docId = '';
    let docVersions: CollectionItemVersion[];
    {
      const { result, unmount } = renderHook(() => {
        docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService.addPage(docId);
        collectionService.addPage(docId);
        collectionService.addPage(docId);
        docVersions = historyService.getVersions(docId);
        return historyService.useDocumentVersionedPages(
          docId,
          docVersions[0].id!
        );
      });
      expect(result.current).toHaveLength(3);
      unmount();
    }

    {
      const { result, unmount } = renderHook(() =>
        historyService.useDocumentVersionedPages(docId, docVersions[1].id)
      );
      expect(result.current).toHaveLength(2);
      unmount();
    }

    {
      const { result, unmount } = renderHook(() =>
        historyService.useDocumentVersionedPages(docId, docVersions[2].id)
      );
      expect(result.current).toHaveLength(1);
      unmount();
    }

    {
      const { result, unmount } = renderHook(() =>
        historyService.useDocumentVersionedPages(docId, docVersions[3].id)
      );
      expect(result.current).toHaveLength(0);
      unmount();
    }
  });

  it(`should gc versions and content`, () => {
    storageService.getSpace().setValue('maxHistoryPerDoc', 3);
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
    expect(storageService.getSpace().getRowCount('history_content')).toBe(3);

    historyService.gc();
    expect(historyService.getVersions(doc1)).toHaveLength(3);
    expect(storageService.getSpace().getRowCount('history_content')).toBe(2);

    // one more title version - one content is removed
    vi.advanceTimersByTime(fakeTimersDelay);
    collectionService.setItemField(doc1, 'title', getNewValue('string'));
    vi.advanceTimersByTime(fakeTimersDelay);

    historyService.gc();
    expect(historyService.getVersions(doc1)).toHaveLength(3);
    expect(storageService.getSpace().getRowCount('history_content')).toBe(1);
  });
});
