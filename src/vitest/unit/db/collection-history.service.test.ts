import { DEFAULT_NOTEBOOK_ID, DEFAULT_SPACE_ID } from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
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
    searchAncestryService.initSearchIndices(DEFAULT_SPACE_ID);
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
        const rowBefore = storageService.getSpace().getRow('collection', docId);
        expect(historyService.getVersions(docId)).toHaveLength(0);
        vi.advanceTimersByTime(100);

        const versionCreatedTime = Date.now();
        const newValue = getNewValue(valueType);
        collectionService.setItemField(docId, field, newValue);
        vi.advanceTimersByTime(100);
        const versions = historyService.getVersions(docId);
        expect(versions).toHaveLength(1);
        expect(versions[0].created).toBe(versionCreatedTime);
        expect(versions[0].docId).toBe(docId);
        expect(versions[0].version).toBe(0);
        const versionData = JSON.parse(versions[0].versionData);
        expect(versionData).toEqual({
          title: rowBefore.title,
          content: rowBefore.content,
          tags: rowBefore.tags,
          deleted: rowBefore.deleted,
          updated: rowBefore.updated
        });
        expect(versionData[field]).not.toBe(newValue);
      });
    });

    it(`should increment old versions`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(0);
      vi.advanceTimersByTime(100);

      collectionService.setItemLexicalContent(docId, shortContent);
      vi.advanceTimersByTime(100);
      let versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(0);
      const firstVersion = versions[0].id;
      vi.advanceTimersByTime(100);

      collectionService.setItemTitle(docId, 'new title');
      vi.advanceTimersByTime(100);
      versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(0);
      expect(versions[1].version).toBe(1);
      expect(versions[1].id).toBe(firstVersion);
    });

    it(`should debounce changes`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expect(historyService.getVersions(docId)).toHaveLength(0);
      vi.advanceTimersByTime(100);

      collectionService.setItemTitle(docId, 'new title 1');
      collectionService.setItemTitle(docId, 'new title 2');
      collectionService.setItemTitle(docId, 'new title 3');

      vi.advanceTimersByTime(100);
      const versions = historyService.getVersions(docId);
      expect(versions).toHaveLength(1);
    });
  });
});
