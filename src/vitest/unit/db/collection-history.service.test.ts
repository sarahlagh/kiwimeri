import { CollectionItem } from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService, { initialContent } from '@/db/collection.service';
import storageService from '@/db/storage.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { it, vi } from 'vitest';
import { GET_CONTENT_UPDATE_FIELDS, getNewValue } from '../../setup/test.utils';

const shortContent = JSON.parse(
  '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"This is a short content","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'
);

describe('collection history service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchAncestryService.start(DEFAULT_SPACE_ID);
    historyService.start(DEFAULT_SPACE_ID);
    historyService['debounce'] = 50;
  });
  afterEach(() => {
    vi.useRealTimers();
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
        expect(versions[0].created).toBe(versionCreatedTime);
        expect(versions[0].itemId).toBe(docId);
        const versionData = JSON.parse(versions[0].versionData);
        expect(versionData).toEqual({
          title: rowBefore.title,
          title_meta: rowBefore.title_meta,
          content: rowBefore.content,
          content_meta: rowBefore.content_meta,
          tags: rowBefore.tags,
          tags_meta: rowBefore.tags_meta,
          deleted: rowBefore.deleted,
          deleted_meta: rowBefore.deleted_meta,
          display_opts: rowBefore.display_opts,
          display_opts_meta: rowBefore.display_opts_meta,
          updated: rowBefore.updated
        });
        expect(versionData[field]).toBe(newValue);
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
      expect(JSON.parse(versions[0].versionData).title).toBe(newValue);
      expect(JSON.parse(versions[1].versionData).title).toBe(itemBefore.title);

      historyService.restoreVersion(docId, versions[1].id!);
      const restoredItem = storageService
        .getSpace()
        .getRow('collection', docId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(3);
      expect(JSON.parse(versions[0].versionData).title).toBe(itemBefore.title);
      expect(JSON.parse(versions[1].versionData).title).toBe(newValue);
      expect(JSON.parse(versions[2].versionData).title).toBe(itemBefore.title);
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
      expect(JSON.parse(versions[0].versionData).title).toBe(newValue1);
      expect(JSON.parse(versions[1].versionData).title).toBe(itemBefore.title);

      // new change, not yet in version
      const newValue2 = getNewValue('string') as string;
      collectionService.setItemTitle(docId, newValue2);
      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      vi.advanceTimersByTime(10);

      historyService.restoreVersion(docId, versions[1].id!);
      const restoredItem = storageService
        .getSpace()
        .getRow('collection', docId) as CollectionItem;
      expect(restoredItem.title).toEqual(itemBefore.title);

      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(4);
      expect(JSON.parse(versions[0].versionData).title).toBe(itemBefore.title);
      expect(versions[0].created).toBe(itemBefore.updated + 210);
      expect(JSON.parse(versions[1].versionData).title).toBe(newValue2);
      expect(versions[1].created).toBe(itemBefore.updated + 200);
      expect(JSON.parse(versions[2].versionData).title).toBe(newValue1);
      expect(versions[2].created).toBe(itemBefore.updated + 100);
      expect(JSON.parse(versions[3].versionData).title).toBe(itemBefore.title);
      expect(versions[3].created).toBe(itemBefore.updated);
    });
  });

  describe(`operations on a page`, () => {
    GET_CONTENT_UPDATE_FIELDS('page').forEach(({ field, valueType }) => {
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
        expect(versions[0].created).toBe(versionCreatedTime);
        expect(versions[0].itemId).toBe(pageId);
        const versionData = JSON.parse(versions[0].versionData);
        expect(versionData).toEqual({
          title: rowBefore.title,
          title_meta: rowBefore.title_meta,
          content: rowBefore.content,
          content_meta: rowBefore.content_meta,
          tags: rowBefore.tags,
          tags_meta: rowBefore.tags_meta,
          deleted: rowBefore.deleted,
          deleted_meta: rowBefore.deleted_meta,
          display_opts: rowBefore.display_opts,
          display_opts_meta: rowBefore.display_opts_meta,
          updated: rowBefore.updated
        });
        expect(versionData[field]).toBe(newValue);
      });
    });

    it(`should version a page and its document`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const pageId1 = collectionService.addPage(docId);
      const pageId2 = collectionService.addPage(docId);
      collectionService.setItemTitle(docId, 'new title');
      vi.advanceTimersByTime(100);
      collectionService.setItemLexicalContent(pageId1, shortContent);
      vi.advanceTimersByTime(100);

      const space = storageService.getSpace();
      expect(space.getRowCount('history')).toBe(8);
      expect(space.getRowCount('history_doc_pages')).toBe(7);
      const docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(5);
      expect(historyService.getVersions(pageId1)).toHaveLength(2);
      expect(historyService.getVersions(pageId2)).toHaveLength(1);

      let pages = historyService.getPagesForVersion(docVersions[0].id!);
      expect(pages).toHaveLength(2);
      expect(pages.map(p => p.itemId)).toEqual([pageId2, pageId1]);

      pages = historyService.getPagesForVersion(docVersions[1].id!);
      expect(pages).toHaveLength(2);
      expect(pages.map(p => p.itemId)).toEqual([pageId1, pageId2]);

      pages = historyService.getPagesForVersion(docVersions[2].id!);
      expect(pages).toHaveLength(2);
      expect(pages.map(p => p.itemId)).toEqual([pageId1, pageId2]);

      pages = historyService.getPagesForVersion(docVersions[3].id!);
      expect(pages).toHaveLength(1);
      expect(pages.map(p => p.itemId)).toEqual([pageId1]);

      expect(
        historyService.getPagesForVersion(docVersions[4].id!)
      ).toHaveLength(0);
    });

    it(`should restore a page and create new document version`, () => {
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

      vi.advanceTimersByTime(100);
      historyService.restoreVersion(pageId, versions[1].id!);

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
      expect(JSON.parse(pageVersion.versionData).content).toBe(
        initialContent()
      );
      expect(pageVersion.versionPreview).toBe('');

      const restoredItem = storageService
        .getSpace()
        .getRow('collection', pageId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });
    });

    it(`should version unsaved changes when restoring to a previous version`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
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

      // restore
      historyService.restoreVersion(pageId, versions[1].id!);

      docVersions = historyService.getVersions(docId);
      expect(docVersions).toHaveLength(5);
      versions = historyService.getVersions(pageId);
      expect(versions).toHaveLength(4);

      let pageVersions = historyService.getPagesForVersion(docVersions[0].id!);
      expect(pageVersions).toHaveLength(1);
      let pageVersion = pageVersions[0];
      expect(pageVersion.itemId).toBe(pageId);
      expect(JSON.parse(pageVersion.versionData).content).toBe(
        initialContent()
      );
      expect(pageVersion.versionPreview).toBe('');

      pageVersions = historyService.getPagesForVersion(docVersions[1].id!);
      expect(pageVersions).toHaveLength(1);
      pageVersion = pageVersions[0];
      expect(pageVersion.itemId).toBe(pageId);
      expect(JSON.parse(pageVersion.versionData).content).toBe(newValue2);

      const restoredItem = storageService
        .getSpace()
        .getRow('collection', pageId) as CollectionItem;
      expect(restoredItem).toEqual({ ...itemBefore, updated: Date.now() });
    });

    it.todo(`should respect pages sort order`, () => {
      //
    });
  });
});
