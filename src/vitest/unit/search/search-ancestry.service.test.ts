import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_COLLECTION
} from '@/constants';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { oneDocument, oneFolder, onePage } from '@/vitest/setup/test.utils';
import { afterEach, describe, expect, it } from 'vitest';

const shortContentPreview = 'This is a short content';
const shortContent = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${shortContentPreview}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

const shortContentPreviewUpdated = 'Updated content';
const shortContentUpdated = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"${shortContentPreviewUpdated}","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

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
  D1.content = shortContent;
  D1.tags = 'tag1';
  const P1 = onePage('P1', D1.id);
  P1.id = 'P1';
  P1.content = shortContent;
  const F2 = oneFolder('F2');
  F2.id = 'F2';
  const FF2 = oneFolder('FF2', F2.id);
  FF2.id = 'FF2';
  collectionService.saveItems([F1, FF1, FFF1, D1, P1, F2, FF2]);
};

const getHardcodedExpectedAncestry = () => {
  const expectedTable = {} as any;
  expectedTable['F1,0'] = { childId: 'F1', parentId: '0', depth: 0 };
  expectedTable['FF1,0'] = {
    childId: 'FF1',
    parentId: '0',
    depth: 1
  };
  expectedTable['FFF1,0'] = {
    childId: 'FFF1',
    parentId: '0',
    depth: 2
  };
  expectedTable['D1,0'] = { childId: 'D1', parentId: '0', depth: 3 };
  expectedTable['P1,0'] = { childId: 'P1', parentId: '0', depth: 4 };
  expectedTable['F2,0'] = { childId: 'F2', parentId: '0', depth: 0 };
  expectedTable['FF2,0'] = {
    childId: 'FF2',
    parentId: '0',
    depth: 1
  };

  expectedTable['FF1,F1'] = {
    childId: 'FF1',
    parentId: 'F1',
    depth: 0
  };
  expectedTable['FFF1,F1'] = {
    childId: 'FFF1',
    parentId: 'F1',
    depth: 1
  };
  expectedTable['D1,F1'] = {
    childId: 'D1',
    parentId: 'F1',
    depth: 2
  };
  expectedTable['P1,F1'] = {
    childId: 'P1',
    parentId: 'F1',
    depth: 3
  };

  expectedTable['FFF1,FF1'] = {
    childId: 'FFF1',
    parentId: 'FF1',
    depth: 0
  };
  expectedTable['D1,FF1'] = {
    childId: 'D1',
    parentId: 'FF1',
    depth: 1
  };
  expectedTable['P1,FF1'] = {
    childId: 'P1',
    parentId: 'FF1',
    depth: 2
  };

  expectedTable['D1,FFF1'] = {
    childId: 'D1',
    parentId: 'FFF1',
    depth: 0
  };
  expectedTable['P1,FFF1'] = {
    childId: 'P1',
    parentId: 'FFF1',
    depth: 1
  };

  expectedTable['P1,D1'] = {
    childId: 'P1',
    parentId: 'D1',
    depth: 0
  };

  expectedTable['FF2,F2'] = {
    childId: 'FF2',
    parentId: 'F2',
    depth: 0
  };
  return expectedTable;
};

const getExpectedAncestry = (paths: string[][]) => {
  const expectedTable = {} as any;
  paths.forEach(path => {
    for (let i = 0; i < path.length; i++) {
      const parentId = path[i];
      for (let j = i + 1; j < path.length; j++) {
        const childId = path[j];
        expectedTable[`${childId},${parentId}`] = {
          childId,
          parentId,
          depth: j - i - 1
        };
      }
    }
  });
  return expectedTable;
};

const testExpectedPaths = (paths: string[][]) => {
  paths.forEach(path => {
    let breadcrumb = '';
    for (let i = 0; i < path.length; i++) {
      if (breadcrumb.length > 0) breadcrumb += ',';
      breadcrumb += path[i];
      expect(searchAncestryService.getShortBreadcrumb(path[i])).toBe(
        breadcrumb
      );
    }
  });
};

describe('search ancestry service', () => {
  afterEach(() => {
    searchAncestryService.stop();
  });

  describe(`ancestry & breadcrumb`, () => {
    it(`should get correct expected ancestry (test)`, () => {
      createTestData();
      expect(getHardcodedExpectedAncestry()).toEqual(
        getExpectedAncestry([
          ['0', 'F1', 'FF1', 'FFF1', 'D1', 'P1'],
          ['0', 'F2', 'FF2']
        ])
      );
    });

    it(`should handle notebook on start if collection is empty`, () => {
      // has at least one notebook
      searchAncestryService.start(DEFAULT_SPACE_ID);

      // test ancestors
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(0); // no ancestry if parent is root

      // test path
      expect(storageService.getStore().getRowIds('search')).toHaveLength(1);
      expect(storageService.getStore().getRowIds('search')[0]).toBe(
        DEFAULT_NOTEBOOK_ID
      );
      expect(
        storageService
          .getStore()
          .getCell('search', DEFAULT_NOTEBOOK_ID, 'breadcrumb')
      ).toBe(DEFAULT_NOTEBOOK_ID);
    });

    it(`should create correct ancestry on start`, () => {
      createTestData();
      searchAncestryService.start(DEFAULT_SPACE_ID);

      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(18);
      const ancestors = storageService.getStore().getTable('ancestors');
      expect(ancestors).toEqual(getHardcodedExpectedAncestry());

      testExpectedPaths([
        ['0', 'F1', 'FF1', 'FFF1', 'D1', 'P1'],
        ['0', 'F2', 'FF2']
      ]);
    });

    it(`should update ancestry on saveItems (import)`, () => {
      searchAncestryService.start(DEFAULT_SPACE_ID);
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(0);

      createTestData();
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(18);
      const ancestors = storageService.getStore().getTable('ancestors');
      expect(ancestors).toEqual(getHardcodedExpectedAncestry());

      testExpectedPaths([
        ['0', 'F1', 'FF1', 'FFF1', 'D1', 'P1'],
        ['0', 'F2', 'FF2']
      ]);
    });

    it(`should update ancestry on individual parent change`, () => {
      // F1 > FF1 > FFF1 > D1 > P1
      // F2 > FF2
      createTestData();
      searchAncestryService.start(DEFAULT_SPACE_ID);
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(18);

      collectionService.setItemParent('FFF1', 'FF2');
      // F1 > FF1
      // F2 > FF2 > FFF1 > D1 > P1

      const ancestors = storageService.getStore().getTable('ancestors');
      expect(ancestors).toEqual(
        getExpectedAncestry([
          ['0', 'F1', 'FF1'],
          ['0', 'F2', 'FF2', 'FFF1', 'D1', 'P1']
        ])
      );
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(18);

      testExpectedPaths([
        ['0', 'F1', 'FF1'],
        ['0', 'F2', 'FF2', 'FFF1', 'D1', 'P1']
      ]);
    });

    it(`should update ancestry on setContent (pull)`, () => {
      createTestData();
      const spaceContent = storageService.getSpace().getContent();
      // add items locally
      collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      notebooksService.addNotebook('N1');

      searchAncestryService.start();
      // pull - newest items are removed
      storageService.getSpace().setContent(spaceContent);

      const ancestors = storageService.getStore().getTable('ancestors');
      expect(ancestors).toEqual(
        getExpectedAncestry([
          ['0', 'F1', 'FF1', 'FFF1', 'D1', 'P1'],
          ['0', 'F2', 'FF2']
        ])
      );
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(18);

      testExpectedPaths([
        ['0', 'F1', 'FF1', 'FFF1', 'D1', 'P1'],
        ['0', 'F2', 'FF2']
      ]);
    });

    it(`should cache and a breadcrumb with only one parent notebook`, () => {
      searchAncestryService.start(DEFAULT_SPACE_ID);
      const idn1 = notebooksService.addNotebook('test');
      const idn2 = notebooksService.addNotebook('nested', idn1);
      const idd1 = collectionService.addDocument(idn2);
      const idp1 = collectionService.addPage(idd1);
      const idf1 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      const idd2 = collectionService.addDocument(idf1);

      expect(searchAncestryService.getShortBreadcrumb(ROOT_COLLECTION)).toBe(
        ''
      );
      expect(
        searchAncestryService.getShortBreadcrumb(DEFAULT_NOTEBOOK_ID)
      ).toBe(DEFAULT_NOTEBOOK_ID);
      expect(searchAncestryService.getShortBreadcrumb(idn1)).toBe(idn1);
      expect(searchAncestryService.getShortBreadcrumb(idn2)).toBe(idn2);
      expect(searchAncestryService.getShortBreadcrumb(idd1)).toBe(
        [idn2, idd1].join(',')
      );
      expect(searchAncestryService.getShortBreadcrumb(idp1)).toBe(
        [idn2, idd1, idp1].join(',')
      );
      expect(searchAncestryService.getShortBreadcrumb(idf1)).toBe(
        [DEFAULT_NOTEBOOK_ID, idf1].join(',')
      );
      expect(searchAncestryService.getShortBreadcrumb(idd2)).toBe(
        [DEFAULT_NOTEBOOK_ID, idf1, idd2].join(',')
      );
    });
  });

  describe(`search table update`, () => {
    it(`should update preview on saveItems (import)`, () => {
      searchAncestryService.start(DEFAULT_SPACE_ID);
      expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(0);

      createTestData();

      expect(
        storageService.getStore().getCell('search', 'D1', 'contentPreview')
      ).toBe(shortContentPreview);

      expect(
        storageService.getStore().getCell('search', 'P1', 'contentPreview')
      ).toBe(shortContentPreview);
    });

    it(`should update preview on individual content change`, () => {
      createTestData();
      searchAncestryService.start(DEFAULT_SPACE_ID);

      collectionService.setItemLexicalContent(
        'D1',
        JSON.parse(shortContentUpdated)
      );

      expect(
        storageService.getStore().getCell('search', 'D1', 'contentPreview')
      ).toBe(shortContentPreviewUpdated);

      expect(
        storageService.getStore().getCell('search', 'P1', 'contentPreview')
      ).toBe(shortContentPreview);
    });

    it(`should update preview on pull`, () => {
      createTestData();
      // update items locally
      collectionService.setItemTitle('D1', 'D1 updated');
      collectionService.addItemTag('D1', 'tag1');
      collectionService.setItemLexicalContent('P1', JSON.parse(shortContent));

      // reset
      const spaceContent = storageService.getSpace().getContent();
      storageService.nukeSpace();
      searchAncestryService.start();

      // pull
      storageService.getSpace().setContent(spaceContent);

      expect(
        storageService.getStore().getCell('search', 'P1', 'contentPreview')
      ).toBe(shortContentPreview);
    });
  });
});
