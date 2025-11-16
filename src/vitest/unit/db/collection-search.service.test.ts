import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_COLLECTION
} from '@/constants';
import { searchService } from '@/db/collection-search.service';
import collectionService from '@/db/collection.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { oneDocument, oneFolder, onePage } from '@/vitest/setup/test.utils';
import { describe, it } from 'vitest';

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
  const P1 = onePage('P1', D1.id);
  P1.id = 'P1';
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
      expect(searchService.getBreadcrumb(path[i])).toBe(breadcrumb);
    }
  });
};

describe('collection search service', () => {
  afterEach(() => {
    searchService.stop();
  });

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
    searchService.initSearchIndices(DEFAULT_SPACE_ID);

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
    searchService.initSearchIndices(DEFAULT_SPACE_ID);

    expect(storageService.getStore().getRowIds('ancestors')).toHaveLength(18);
    const ancestors = storageService.getStore().getTable('ancestors');
    expect(ancestors).toEqual(getHardcodedExpectedAncestry());

    testExpectedPaths([
      ['0', 'F1', 'FF1', 'FFF1', 'D1', 'P1'],
      ['0', 'F2', 'FF2']
    ]);
  });

  it(`should update ancestry on saveItems (import)`, () => {
    searchService.initSearchIndices(DEFAULT_SPACE_ID);
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
    searchService.initSearchIndices(DEFAULT_SPACE_ID);
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

  it(`should cache and a breadcrumb with only one parent notebook`, () => {
    searchService.initSearchIndices(DEFAULT_SPACE_ID);
    const idn1 = notebooksService.addNotebook('test');
    const idn2 = notebooksService.addNotebook('nested', idn1);
    const idd1 = collectionService.addDocument(idn2);
    const idp1 = collectionService.addPage(idd1);
    const idf1 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
    const idd2 = collectionService.addDocument(idf1);

    expect(searchService.getBreadcrumb(ROOT_COLLECTION)).toBe('');
    expect(searchService.getBreadcrumb(DEFAULT_NOTEBOOK_ID)).toBe(
      DEFAULT_NOTEBOOK_ID
    );
    expect(searchService.getBreadcrumb(idn1)).toBe(idn1);
    expect(searchService.getBreadcrumb(idn2)).toBe(idn2);
    expect(searchService.getBreadcrumb(idd1)).toBe([idn2, idd1].join(','));
    expect(searchService.getBreadcrumb(idp1)).toBe(
      [idn2, idd1, idp1].join(',')
    );
    expect(searchService.getBreadcrumb(idf1)).toBe(
      [DEFAULT_NOTEBOOK_ID, idf1].join(',')
    );
    expect(searchService.getBreadcrumb(idd2)).toBe(
      [DEFAULT_NOTEBOOK_ID, idf1, idd2].join(',')
    );
  });
});
