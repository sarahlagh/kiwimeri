import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import { space, spaceDocContent } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { startDbListeners, stopDbListeners } from '@/core/db/store-listeners';
import collectionService from '@/domain/collection/collection.service';
import { minimizeContentForStorage } from '@/domain/collection/compress-file-content';
import notebooksService from '@/domain/collection/notebooks.service';
import { resumeService } from '@/domain/collection/resume-state.service';
import { storageService } from '@/domain/space-merging/storage.service';
import { adv, oneDocument, oneFolder } from '@@/_setup/test.utils';
import { describe, expect, it } from 'vitest';

const shortContentPreview = 'This is a short content';
const shortContent = JSON.parse(
  `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${shortContentPreview}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`
);

const shortContentPreviewUpdated = 'Updated content';
const shortContentUpdated = JSON.parse(
  `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${shortContentPreviewUpdated}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`
);

const createTestData = () => {
  // F1 > FF1 > FFF1 > D1 > P1
  // F2 > FF2
  const F1 = oneFolder('F1');
  F1.id = 'F1';
  const FF1 = oneFolder('FF1', F1.id);
  FF1.id = 'FF1';
  const FFF1 = oneFolder('FFF1', FF1.id);
  FFF1.id = 'FFF1';
  const D1 = oneDocument('D1', FFF1.id);
  D1.id = 'D1';
  D1.content = minimizeContentForStorage(shortContent);
  D1.tags = ['tag1'];
  const F2 = oneFolder('F2');
  F2.id = 'F2';
  const FF2 = oneFolder('FF2', F2.id);
  FF2.id = 'FF2';
  collectionService.saveItems([F1, FF1, FFF1, D1, F2, FF2]);
};

const testExpectedPaths = (paths: string[][]) => {
  paths.forEach(path => {
    const breadcrumb: string[] = [];
    for (let i = 0; i < path.length; i++) {
      breadcrumb.push(path[i]);
      expect(collectionService.getBreadcrumb(path[i])).toEqual(breadcrumb);
    }
  });
};

describe('derived state', () => {
  describe(`derived state - full path, short path`, () => {
    it(`should handle notebook on start if collection is empty`, () => {
      // has at least one notebook

      // test path
      expect(space.getRowIds(SpaceTables.ProjectedState)).toHaveLength(1);
      expect(space.getRowIds(SpaceTables.ProjectedState)[0]).toBe(
        DEFAULT_NOTEBOOK_ID
      );
      expect(
        space.getCell(
          SpaceTables.ProjectedState,
          DEFAULT_NOTEBOOK_ID,
          'shortPath'
        )
      ).toEqual([DEFAULT_NOTEBOOK_ID]);
    });

    it(`should create correct item states on saveItems`, () => {
      createTestData();

      testExpectedPaths([
        ['0', 'F1', 'FF1', 'FFF1', 'D1'],
        ['0', 'F2', 'FF2']
      ]);
    });

    it(`should update path on individual parent change`, () => {
      // F1 > FF1 > FFF1 > D1
      // F2 > FF2
      createTestData();

      collectionService.setItemParent('FFF1', 'FF2');
      // F1 > FF1
      // F2 > FF2 > FFF1 > D1

      testExpectedPaths([
        ['0', 'F1', 'FF1'],
        ['0', 'F2', 'FF2', 'FFF1', 'D1']
      ]);
    });

    it(`should update path on setContent (pull)`, () => {
      createTestData();
      const space_content = space.getContent();
      // add items locally
      collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      notebooksService.addNotebook('N1');

      // pull - newest items are removed
      space.setContent(space_content);
      collectionService.backfillProjectedStates(space_content[0].collection);

      testExpectedPaths([
        ['0', 'F1', 'FF1', 'FFF1', 'D1'],
        ['0', 'F2', 'FF2']
      ]);
    });

    it(`should return breadcrumb with only one parent notebook`, () => {
      const idn1 = notebooksService.addNotebook('test');
      const idn2 = notebooksService.addNotebook('nested', idn1);
      const idd1 = collectionService.addDocument(idn2);
      const idf1 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const idd2 = collectionService.addDocument(idf1);

      expect(collectionService.getBreadcrumb(ROOT_COLLECTION)).toEqual([]);
      expect(collectionService.getBreadcrumb(DEFAULT_NOTEBOOK_ID)).toEqual([
        DEFAULT_NOTEBOOK_ID
      ]);
      expect(collectionService.getBreadcrumb(idn1)).toEqual([idn1]);
      expect(collectionService.getBreadcrumb(idn2)).toEqual([idn2]);
      expect(collectionService.getBreadcrumb(idd1)).toEqual([idn2, idd1]);
      expect(collectionService.getBreadcrumb(idf1)).toEqual([
        DEFAULT_NOTEBOOK_ID,
        idf1
      ]);
      expect(collectionService.getBreadcrumb(idd2)).toEqual([
        DEFAULT_NOTEBOOK_ID,
        idf1,
        idd2
      ]);
    });

    it(`should return breadcrumb with all parent notebooks`, () => {
      const idn1 = notebooksService.addNotebook('test');
      const idn2 = notebooksService.addNotebook('nested', idn1);
      const idd1 = collectionService.addDocument(idn2);
      const idf1 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const idd2 = collectionService.addDocument(idf1);

      expect(collectionService.getBreadcrumb(ROOT_COLLECTION, true)).toEqual(
        []
      );
      expect(
        collectionService.getBreadcrumb(DEFAULT_NOTEBOOK_ID, true)
      ).toEqual([DEFAULT_NOTEBOOK_ID]);
      expect(collectionService.getBreadcrumb(idn1, true)).toEqual([idn1]);
      expect(collectionService.getBreadcrumb(idn2, true)).toEqual([idn1, idn2]);
      expect(collectionService.getBreadcrumb(idd1, true)).toEqual([
        idn1,
        idn2,
        idd1
      ]);
      expect(collectionService.getBreadcrumb(idf1, true)).toEqual([
        DEFAULT_NOTEBOOK_ID,
        idf1
      ]);
      expect(collectionService.getBreadcrumb(idd2, true)).toEqual([
        DEFAULT_NOTEBOOK_ID,
        idf1,
        idd2
      ]);
    });

    it(`should delete state on item deletion`, () => {
      // F1 > FF1 > FFF1 > D1
      // F2 > FF2
      createTestData();

      collectionService.deleteItem('FF1');

      expect(space.hasRow(SpaceTables.ProjectedState, 'F1')).toBe(true);
      expect(space.hasRow(SpaceTables.ProjectedState, 'FF1')).toBe(false);
      expect(space.hasRow(SpaceTables.ProjectedState, 'FFF1')).toBe(false);
      expect(space.hasRow(SpaceTables.ProjectedState, 'D1')).toBe(false);
      expect(space.hasRow(SpaceTables.ProjectedState, 'F2')).toBe(true);
      expect(space.hasRow(SpaceTables.ProjectedState, 'FF2')).toBe(true);
    });
  });

  describe(`derived content update`, () => {
    it(`should update plainText on saveItems (import)`, () => {
      createTestData();

      expect(
        spaceDocContent.getCell('collection_content', 'D1', 'plainText')
      ).toBe(shortContentPreview);
    });

    it(`should update plainText on individual content change`, () => {
      createTestData();

      collectionService.setItemLexicalContent('D1', shortContentUpdated);

      expect(
        spaceDocContent.getCell('collection_content', 'D1', 'plainText')
      ).toBe(shortContentPreviewUpdated);
    });

    it.skip(`should update plainText on pull`, () => {
      createTestData();
      // update items locally
      collectionService.setItemTitle('D1', 'D1 updated');
      collectionService.addItemTag('D1', 'tag1');
      collectionService.setItemLexicalContent('D1', shortContent);

      // reset
      const _spaceContent = space.getContent();
      const _spaceDocContentContent = spaceDocContent.getContent();
      storageService.nukeSpace();

      // pull
      // TODO not real test
      space.setContent(_spaceContent);
      spaceDocContent.setContent(_spaceDocContentContent);

      expect(
        spaceDocContent.getCell('collection_content', 'D1', 'plainText')
      ).toBeDefined();
    });

    it(`should delete plainText on item deletion`, () => {
      // F1 > FF1 > FFF1 > D1
      // F2 > FF2
      createTestData();

      expect(spaceDocContent.hasRow('collection_content', 'D1')).toBe(true);

      collectionService.deleteItem('FF1');

      expect(space.hasRow(SpaceTables.CollectionItemView, 'D1')).toBe(false);
    });
  });

  describe(`derived sorting ranks`, () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function expectUpdatedAtRank(rowId: string, rank?: number) {
      expect(
        space.getCell(SpaceTables.CollectionItemView, rowId, 'updatedAtRank')
      ).toBe(rank);
    }
    function expectLastOpenedAtRank(rowId: string, rank?: number) {
      expect(
        space.getCell(SpaceTables.CollectionItemView, rowId, 'lastOpenedAtRank')
      ).toBe(rank);
    }

    test('any update should set the updatedAtRank and lastOpenedAtRank columns', () => {
      expect(space.getRowCount(SpaceTables.Collection)).toBe(1);
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      adv(() => collectionService.setItemTitle(docId, 'yo'));
      const doc1 = oneDocument();
      adv(() => collectionService.saveItem(doc1, doc1.id));
      adv(() => resumeService.setLastOpenedAt(docId, Date.now()));
      doc1.title = 'another';
      doc1.title = 'and another';
      const doc2 = oneDocument();
      adv(() => collectionService.saveItems([doc1, doc2]));
      adv(() => resumeService.setLastOpenedAt(doc1.id, Date.now()));
      adv(() => collectionService.deleteItem(docId));
      adv(() => collectionService.setItemTitle(doc1.id, 'yo'));
      expect(space.getRowCount(SpaceTables.Collection)).toBe(3); // doc1 + doc2 + notebook
      expect(space.hasRow(SpaceTables.ProjectedState, docId)).toBe(false);
      // doc2, doc1

      expectUpdatedAtRank(DEFAULT_NOTEBOOK_ID, 0);
      expectLastOpenedAtRank(DEFAULT_NOTEBOOK_ID, undefined);

      expectUpdatedAtRank(doc2.id, 1);
      expectLastOpenedAtRank(doc2.id, undefined);

      expectUpdatedAtRank(doc1.id, 2);
      expectLastOpenedAtRank(doc1.id, 1);

      expectUpdatedAtRank(docId, undefined);
      expectLastOpenedAtRank(docId, undefined);
    });

    test('rank should be updated after sync', () => {
      stopDbListeners();
      const doc1Id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const doc2Id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const doc3Id = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      expectUpdatedAtRank(doc1Id, undefined);
      expectUpdatedAtRank(doc2Id, undefined);
      expectUpdatedAtRank(doc3Id, undefined);
      const space_content = space.getContent();
      space.setContent([{}, {}]);
      startDbListeners();

      space.setContent([
        {
          collection: space_content[0].collection,
          collection_projected_state:
            space_content[0].collection_projected_state
        },
        {}
      ]);
      collectionService.backfillProjectedStates();
      expectUpdatedAtRank(doc1Id, 1);
      expectUpdatedAtRank(doc2Id, 2);
      expectUpdatedAtRank(doc3Id, 3);
    });
  });
});
