import { CollectionItem, CollectionItemType } from '@/collection/collection';
import {
  importService,
  ZipImportOptions,
  ZipMergeCommitOptions,
  ZipMergeFistLevel,
  ZipMergeResult
} from '@/common/services/import.service';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import notebooksService from '@/db/notebooks.service';
import storageService from '@/db/storage.service';
import { LocalChangeType } from '@/db/types/store-types';
import formatterService from '@/format-conversion/formatter.service';
import {
  getLocalItemField,
  getRowCountInsideNotebook
} from '@/vitest/setup/test.utils';
import { readFile } from 'fs/promises';
import { it, vi } from 'vitest';

type JsonTestDescriptor = {
  zipName: string;
  name: string;
  ignore?: boolean;
  testCases: {
    description: string;
    ignore?: boolean;
    initData: Pick<
      Partial<CollectionItem>,
      'id' | 'title' | 'type' | 'parent'
    >[];
    commitOptions?: ZipMergeCommitOptions[];
    scenarios: {
      ignore?: boolean;
      description: string;
      options: ZipImportOptions[];
      expected: Partial<ZipMergeResult>;
    }[];
  }[];
};

const readZip = async (
  parentDir: string,
  zipName: string,
  opts?: ZipImportOptions,
  parent = DEFAULT_NOTEBOOK_ID
) => {
  const zip = await readFile(`${__dirname}/${parentDir}/${zipName}`);
  const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
  const unzipped = await importService.readZip(zipBuffer);
  return importService.parseZipData(zipName, parent, unzipped, opts);
};

const createInitData = (initData: Partial<CollectionItem>[]) => {
  const ids = new Map<string, string>();

  const createItem = (item: CollectionItem, data: Partial<CollectionItem>) => {
    item.title = data.title!;
    if (data.id) {
      ids.set(data.id, item.id!);
    }
    if (data.parent) {
      item.parent = data.parent.startsWith('#')
        ? ids.get(data.parent)!
        : data.parent;
    }
    return item;
  };

  const initialItems: CollectionItem[] = initData.map(data => {
    if (data.type === CollectionItemType.document) {
      const { item, id } =
        collectionService.getNewDocumentObj(DEFAULT_NOTEBOOK_ID);
      return createItem({ ...item, id }, data);
    } else if (data.type === CollectionItemType.page) {
      const { item, id } = collectionService.getNewPageObj(data.parent!);
      return createItem({ ...item, id, title: '', title_meta: '' }, data);
    } else if (data.type === CollectionItemType.folder) {
      const { item, id } =
        collectionService.getNewFolderObj(DEFAULT_NOTEBOOK_ID);
      return createItem({ ...item, id }, data);
    }
    throw new Error('unsupported type in test');
  });
  console.debug('initial items', initialItems);
  if (initialItems.length > 0) {
    collectionService.saveItems(initialItems, DEFAULT_NOTEBOOK_ID);
  }
  return { ids, initialItems };
};

describe('import service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('finding duplicates', () => {
    it(`should find no duplicates when collection empty`, () => {
      expect(
        importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [])
      ).toHaveLength(0);
      expect(
        importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
          {
            title: 'test',
            type: CollectionItemType.document
          }
        ])
      ).toHaveLength(0);
    });

    it(`should find no duplicates when inputs do not match title and type`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(docId, 'Test');

      expect(
        importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
          {
            title: 'test',
            type: CollectionItemType.document
          }
        ])
      ).toHaveLength(0);

      expect(
        importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
          {
            title: 'test',
            type: CollectionItemType.folder
          }
        ])
      ).toHaveLength(0);
    });

    it(`should find no duplicates when inputs do match title but not type`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(docId, 'Test');

      expect(
        importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
          {
            title: 'Test',
            type: CollectionItemType.folder
          }
        ])
      ).toHaveLength(0);
    });

    it(`should find a document duplicate when inputs match title and type`, () => {
      const docId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(docId, 'Test');

      const duplicates = importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
        {
          title: 'Test',
          type: CollectionItemType.document
        }
      ]);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].id).toBe(docId);
    });

    it(`should find a folder duplicate when inputs match title and type`, () => {
      const folId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(folId, 'Test');

      const duplicates = importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
        {
          title: 'Test',
          type: CollectionItemType.folder
        }
      ]);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].id).toBe(folId);
    });

    it(`should find multiple duplicates when inputs match title and type`, () => {
      const docId1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(docId1, 'Test');

      const docId2 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(docId2, 'Test');

      const folId1 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(folId1, 'Test');

      const folId2 = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(folId2, 'Test 2');

      const duplicates = importService.findDuplicates(DEFAULT_NOTEBOOK_ID, [
        {
          title: 'Test',
          type: CollectionItemType.document
        },
        {
          title: 'Test',
          type: CollectionItemType.folder
        }
      ]);

      expect(duplicates).toHaveLength(3);
      expect(duplicates.map(dupl => dupl.id)).toEqual([docId1, docId2, folId1]);
    });
  });

  describe('merging single documents', () => {
    it('save single new document', () => {
      const { doc, pages } = importService.getLexicalFromContent(
        'This is some content'
      );
      expect(doc).toBeDefined();
      expect(pages).toHaveLength(0);
      const id = importService.commitDocument(
        doc,
        pages,
        DEFAULT_NOTEBOOK_ID,
        'New doc'
      );
      expect(id).toBeDefined();
      expect(collectionService.itemExists(id!)).toBe(true);
    });

    it('overwrite existing document', () => {
      const before = Date.now();
      const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(id1, 'New doc');
      vi.advanceTimersByTime(5000);

      const { doc, pages } = importService.getLexicalFromContent(
        'This is some content'
      );
      expect(doc).toBeDefined();
      expect(pages).toHaveLength(0);
      const id2 = importService.commitDocument(
        doc,
        pages,
        DEFAULT_NOTEBOOK_ID,
        'New doc',
        id1
      );
      expect(id2).toBe(id1);
      expect(collectionService.itemExists(id2!)).toBe(true);
      expect(collectionService.getItemField(id2!, 'updated')).toBe(
        before + 5000
      );
    });

    it('save single new document with pages', () => {
      const { doc, pages } = importService.getLexicalFromContent(
        'This is some content' +
          formatterService.getPagesSeparator() +
          'And a page'
      );
      expect(doc).toBeDefined();
      expect(pages).toHaveLength(1);
      const id = importService.commitDocument(
        doc,
        pages,
        DEFAULT_NOTEBOOK_ID,
        'New doc'
      );
      expect(id).toBeDefined();
      expect(collectionService.itemExists(id!)).toBe(true);
      expect(collectionService.getDocumentPages(id!)).toHaveLength(1);
    });

    it('overwrite existing document with no previous pages', () => {
      const before = Date.now();
      const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(id1, 'New doc');
      vi.advanceTimersByTime(5000);

      const { doc, pages } = importService.getLexicalFromContent(
        'This is some content' +
          formatterService.getPagesSeparator() +
          'And a page'
      );

      expect(doc).toBeDefined();
      expect(pages).toHaveLength(1);
      const id2 = importService.commitDocument(
        doc,
        pages,
        DEFAULT_NOTEBOOK_ID,
        'New doc',
        id1
      );
      expect(id2).toBe(id1);
      expect(collectionService.itemExists(id2!)).toBe(true);
      expect(collectionService.getItemField(id2!, 'updated')).toBe(
        before + 5000
      );
      expect(collectionService.getDocumentPages(id2!)).toHaveLength(1);
    });

    it('overwrite existing document with previous pages and deleteExistingPages=true', () => {
      const before = Date.now();
      const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const idp1 = collectionService.addPage(id1);
      const idp2 = collectionService.addPage(id1);
      collectionService.setItemTitle(id1, 'New doc');
      vi.advanceTimersByTime(5000);

      const { doc, pages } = importService.getLexicalFromContent(
        'This is some content' +
          formatterService.getPagesSeparator() +
          'And a page'
      );

      expect(doc).toBeDefined();
      expect(pages).toHaveLength(1);
      const id2 = importService.commitDocument(
        doc,
        pages,
        DEFAULT_NOTEBOOK_ID,
        'New doc',
        id1,
        { deleteExistingPages: true }
      );
      expect(id2).toBe(id1);
      expect(collectionService.itemExists(id2!)).toBe(true);
      expect(collectionService.getItemField(id2!, 'updated')).toBe(
        before + 5000
      );
      const newPages = collectionService.getDocumentPages(id2!);
      expect(newPages).toHaveLength(1);
      expect(newPages[0]).not.toBe(idp1);
      expect(newPages[0]).not.toBe(idp2);
    });

    it('overwrite existing document with previous pages and deleteExistingPages=false', () => {
      const before = Date.now();
      const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      const idp1 = collectionService.addPage(id1);
      const idp2 = collectionService.addPage(id1);
      collectionService.setItemTitle(id1, 'New doc');
      vi.advanceTimersByTime(5000);

      const { doc, pages } = importService.getLexicalFromContent(
        'This is some content' +
          formatterService.getPagesSeparator() +
          'And a page'
      );

      expect(doc).toBeDefined();
      expect(pages).toHaveLength(1);
      const id2 = importService.commitDocument(
        doc,
        pages,
        DEFAULT_NOTEBOOK_ID,
        'New doc',
        id1,
        { deleteExistingPages: false }
      );
      expect(id2).toBe(id1);
      expect(collectionService.itemExists(id2!)).toBe(true);
      expect(collectionService.getItemField(id2!, 'updated')).toBe(
        before + 5000
      );
      const newPages = collectionService.getDocumentPages(id2!);
      expect(newPages).toHaveLength(3);
      expect(newPages.find(page => page.id === idp1)).toBeDefined();
      expect(newPages.find(page => page.id === idp2)).toBeDefined();
    });
  });

  const checkResultsArray = (
    zipMergeArray: (Partial<CollectionItem> | ZipMergeFistLevel)[],
    expectedArray?: (Partial<CollectionItem> | ZipMergeFistLevel)[],
    ids = new Map<string, string>(),
    writeIdsMap = true
  ) => {
    if (expectedArray) {
      expectedArray.forEach((expectedItem, idx) => {
        const mergedItem = zipMergeArray[idx];
        if (mergedItem.type !== CollectionItemType.page) {
          expect(mergedItem.title).toBe(expectedItem.title);
        }
        expect(mergedItem.type).toBe(expectedItem.type);
        if (expectedItem.id && writeIdsMap) {
          ids.set(expectedItem.id, mergedItem.id!);
        }
        if (expectedItem.id && !writeIdsMap) {
          expect(mergedItem.id).toBe(ids.get(expectedItem.id));
        }
        if ('parent' in expectedItem && expectedItem.parent) {
          expect((mergedItem as CollectionItem).parent).toBe(
            expectedItem.parent.startsWith('#')
              ? ids.get(expectedItem.parent)
              : expectedItem.parent
          );
        }
        if ('content' in expectedItem && expectedItem.content !== undefined) {
          expect((mergedItem as CollectionItem).content).toBeDefined();
          expect((mergedItem as CollectionItem).preview).toBeDefined();
        }
        if ('updated' in expectedItem) {
          expect((mergedItem as CollectionItem).updated).toBe(
            expectedItem.updated
          );
        }
        if ('tags' in expectedItem) {
          expect((mergedItem as CollectionItem).tags).toBe(expectedItem.tags);
        }
      });
    }
    return ids;
  };

  const checkResults = (
    zipMerge: ZipMergeResult,
    expected: Partial<ZipMergeResult>,
    initDataIds: Map<string, string>,
    creationTs: number,
    updateTs: number
  ) => {
    expect(zipMerge.updatedItems).toHaveLength(
      expected.updatedItems?.length || 0
    );
    expect(zipMerge.duplicates).toHaveLength(expected.duplicates?.length || 0);
    expect(zipMerge.newItems).toHaveLength(expected.newItems?.length || 0);
    expect(zipMerge.firstLevel).toHaveLength(expected.firstLevel?.length || 0);

    const newItemsIds = checkResultsArray(
      zipMerge.newItems,
      expected.newItems,
      initDataIds
    );
    checkResultsArray(
      zipMerge.firstLevel,
      expected.firstLevel,
      new Map([...initDataIds, ...newItemsIds]),
      false
    );
    checkResultsArray(
      zipMerge.updatedItems,
      expected.updatedItems,
      initDataIds,
      false
    );
    checkResultsArray(
      zipMerge.duplicates,
      expected.duplicates,
      initDataIds,
      false
    );

    // check updated, created of newItems & updatedItems
    zipMerge.newItems.forEach((item, idx) => {
      const expectedItem = expected.newItems
        ? expected.newItems[idx]
        : undefined;
      expect(item.created).toBe(
        expectedItem?.created !== undefined ? expectedItem.created : updateTs
      );
      expect(item.updated).toBe(
        expectedItem?.updated !== undefined ? expectedItem.updated : updateTs
      );
    });
    zipMerge.updatedItems.forEach((item, idx) => {
      const expectedItem = expected.newItems
        ? expected.newItems[idx]
        : undefined;
      expect(item.created).toBe(
        expectedItem?.created !== undefined ? expectedItem.created : creationTs
      );
      expect(item.updated).toBe(
        expectedItem?.updated !== undefined ? expectedItem.updated : updateTs
      );
    });
  };

  const checkResultsDb = (
    initData: CollectionItem[],
    zipMerge: ZipMergeResult,
    commitOpts: ZipMergeCommitOptions
  ) => {
    const initDataNotDel = initData.filter(data =>
      commitOpts.deleteExistingPages && data.type === CollectionItemType.page
        ? !zipMerge.updatedItems.find(i => i.id === data.parent)
        : true
    );

    expect(getRowCountInsideNotebook()).toBe(
      initDataNotDel.length + zipMerge.newItems.length
    );
    expect(
      localChangesService
        .getLocalChanges()
        .filter(lc => lc.change === LocalChangeType.add)
    ).toHaveLength(zipMerge.newItems.length);
    expect(
      localChangesService
        .getLocalChanges()
        .filter(lc => lc.change === LocalChangeType.delete)
    ).toHaveLength(initData.length - initDataNotDel.length);
    expect(
      localChangesService
        .getLocalChanges()
        .filter(lc => lc.change === LocalChangeType.update)
    ).toHaveLength(zipMerge.updatedItems.length);

    const items = [...zipMerge.newItems, ...zipMerge.updatedItems];
    items.forEach(item => {
      expect(item.id).toBeDefined();
      expect(collectionService.itemExists(item.id!)).toBe(true);
      if (item.type === CollectionItemType.document) {
        const pages = collectionService.getDocumentPages(item.id!);

        expect(pages).toHaveLength(
          items.filter(p => p.parent === item.id).length +
            initDataNotDel.filter(p => p.parent === item.id).length
        );
      }
    });
  };

  const generateTestsCases = async (
    parentDir: string,
    jsonTestCases: string[]
  ) => {
    for (const jsonName of jsonTestCases) {
      let json = '';
      try {
        json = await readFile(
          `${__dirname}/${parentDir}/test_descriptors/${jsonName}.json`,
          'utf8'
        );
      } catch (e) {
        continue;
      }
      const testDescriptor: JsonTestDescriptor = JSON.parse(json);
      if (testDescriptor.ignore === true) {
        continue;
      }

      describe(`should import ${testDescriptor.zipName}`, () => {
        testDescriptor.testCases
          .filter(testCase => testCase.ignore !== true)
          .forEach(testCase => {
            if (!testCase.commitOptions) {
              testCase.commitOptions = [{}];
            }
            testCase.commitOptions.forEach((commitOpts, idx) => {
              console.log('commitOpts', commitOpts);

              describe(`${testCase.description} and commit options #${idx}`, () => {
                testCase.scenarios
                  .filter(scenario => scenario.ignore !== true)
                  .forEach(scenario => {
                    describe(`${scenario.description}`, () => {
                      scenario.options.forEach((options, oIdx) => {
                        it(`and options #${oIdx}`, async () => {
                          console.log('options', options);

                          const creationTs = Date.now();
                          const { ids: initDataIds, initialItems } =
                            createInitData(testCase.initData);
                          localChangesService.clear();
                          vi.advanceTimersByTime(5000);
                          const updateTs = Date.now();

                          const zipContent = await readZip(
                            parentDir,
                            testDescriptor.zipName,
                            options
                          );

                          const zipMerge = importService.mergeZipItems(
                            testDescriptor.name,
                            zipContent,
                            DEFAULT_NOTEBOOK_ID,
                            options
                          );

                          console.debug('merge results', zipMerge);

                          checkResults(
                            zipMerge,
                            scenario.expected,
                            initDataIds,
                            creationTs,
                            updateTs
                          );

                          // save results and check db
                          importService.commitMergeResult(zipMerge, commitOpts);

                          console.debug(
                            'db after save',
                            storageService.getSpace().getTable('collection')
                          );

                          checkResultsDb(initialItems, zipMerge, commitOpts);
                        });
                      });
                    });
                  });
              });
            });
          });
      });
    }
  };

  describe('merging zips without metadata', async () => {
    await generateTestsCases('zips_without_meta', [
      'Simple.zip',
      'SimpleWithDuplicates.zip',
      'SimpleLayer.zip',
      'SimplePagesInline.zip',
      'Samples.zip'
    ]);

    it(`should update parent ts when importing if not home`, async () => {
      const before = Date.now();
      const id = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      vi.advanceTimersByTime(5000);
      const zipContent = await readZip(
        'zips_without_meta',
        'Simple.zip',
        undefined,
        id
      );
      const zipMerge = importService.mergeZipItems('Simple', zipContent, id, {
        createNewFolder: false,
        overwrite: false
      });
      expect(zipMerge.newItems).toHaveLength(1);
      expect(zipMerge.newItems[0].parent).toBe(id);
      // save results and check db
      collectionService.saveItems(zipMerge.newItems, id);
      expect(getLocalItemField(id, 'updated')).toBe(before + 5000);
    });

    it(`should import as notebook if asked and createNewFolder=false`, async () => {
      const zip = await readFile(`${__dirname}/zips_without_meta/Samples.zip`);
      const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
      const unzipped = await importService.readZip(zipBuffer);
      const zipContent = importService.parseZipData(
        'Samples',
        DEFAULT_NOTEBOOK_ID,
        unzipped,
        {
          createNotebook: true
        }
      );

      const zipMerge = importService.mergeZipItems(
        'Samples',
        zipContent,
        DEFAULT_NOTEBOOK_ID,
        {
          createNewFolder: false,
          overwrite: false
        }
      );

      expect(zipMerge.newItems).toHaveLength(20);
      expect(zipMerge.duplicates).toHaveLength(0);
      expect(zipMerge.updatedItems).toHaveLength(0);

      // one notebook has been created
      const notebooks = zipMerge.newItems.filter(
        item => item.type === CollectionItemType.notebook
      );
      expect(notebooks).toHaveLength(1);
      expect(notebooks[0].title).toBe('Samples');
      const defaultNotebook = notebooksService.getCurrentNotebook();
      // zipMerge.newItems
      //   .filter(item => item.type !== CollectionItemType.notebook)
      //   .forEach(item => {
      //     expect(item.notebook).toBe(notebooks[0].id);
      //     expect(item.notebook).not.toBe(defaultNotebook);
      //   });
    });

    it(`should import as notebook if asked and createNewFolder=true`, async () => {
      const zip = await readFile(`${__dirname}/zips_without_meta/Samples.zip`);
      const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
      const unzipped = await importService.readZip(zipBuffer);
      const zipContent = importService.parseZipData(
        'Samples',
        DEFAULT_NOTEBOOK_ID,
        unzipped,
        {
          createNotebook: true
        }
      );

      const zipMerge = importService.mergeZipItems(
        'Samples',
        zipContent,
        DEFAULT_NOTEBOOK_ID,
        {
          createNewFolder: true,
          overwrite: false
        }
      );

      expect(zipMerge.newItems).toHaveLength(21);
      expect(zipMerge.duplicates).toHaveLength(0);
      expect(zipMerge.updatedItems).toHaveLength(0);

      // one notebook has been created
      const notebooks = zipMerge.newItems.filter(
        item => item.type === CollectionItemType.notebook
      );
      expect(notebooks).toHaveLength(1);
      expect(notebooks[0].title).toBe('Samples');
      const defaultNotebook = notebooksService.getCurrentNotebook();
      // zipMerge.newItems
      //   .filter(item => item.type !== CollectionItemType.notebook)
      //   .forEach(item => {
      //     expect(item.notebook).toBe(notebooks[0].id);
      //     expect(item.notebook).not.toBe(defaultNotebook);
      //   });
    });
  });

  describe.skip('merging zips with metadata', async () => {
    await generateTestsCases('zips_with_meta', [
      'Empty.zip',
      'Simple.zip',
      'SimpleLayer.zip',
      'SimplePagesInline.zip',
      'SimpleWithDuplicates.zip',
      'SimpleSub.zip',
      'SimpleSubPartialMeta.zip',
      'SimpleSubPartialFiles.zip'
    ]);

    it(`should import as notebook if asked and zip doesn't contain one and createNewFolder=false`, async () => {
      const zip = await readFile(`${__dirname}/zips_with_meta/Simple.zip`);
      const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
      const unzipped = await importService.readZip(zipBuffer);
      const zipContent = importService.parseZipData(
        'Simple',
        DEFAULT_NOTEBOOK_ID,
        unzipped,
        {
          createNotebook: true
        }
      );

      const zipMerge = importService.mergeZipItems(
        'Simple',
        zipContent,
        DEFAULT_NOTEBOOK_ID,
        {
          createNewFolder: false,
          overwrite: false
        }
      );

      expect(zipMerge.newItems).toHaveLength(2);
      expect(zipMerge.duplicates).toHaveLength(0);
      expect(zipMerge.updatedItems).toHaveLength(0);

      // one notebook has been created
      const notebooks = zipMerge.newItems.filter(
        item => item.type === CollectionItemType.notebook
      );
      expect(notebooks).toHaveLength(1);
      expect(notebooks[0].title).toBe('Simple');
      const defaultNotebook = notebooksService.getCurrentNotebook();
      // zipMerge.newItems
      //   .filter(item => item.type !== CollectionItemType.notebook)
      //   .forEach(item => {
      //     expect(item.notebook).toBe(notebooks[0].id);
      //     expect(item.notebook).not.toBe(defaultNotebook);
      //   });
    });

    it(`should import as notebook if asked and zip doesn't contain one and createNewFolder=true`, async () => {
      const zip = await readFile(`${__dirname}/zips_with_meta/Simple.zip`);
      const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
      const unzipped = await importService.readZip(zipBuffer);
      const zipContent = importService.parseZipData(
        'Simple',
        DEFAULT_NOTEBOOK_ID,
        unzipped,
        {
          createNotebook: true
        }
      );

      const zipMerge = importService.mergeZipItems(
        'Simple',
        zipContent,
        DEFAULT_NOTEBOOK_ID,
        {
          createNewFolder: true,
          overwrite: false
        }
      );

      expect(zipMerge.newItems).toHaveLength(3);
      expect(zipMerge.duplicates).toHaveLength(0);
      expect(zipMerge.updatedItems).toHaveLength(0);

      // one notebook has been created
      const notebooks = zipMerge.newItems.filter(
        item => item.type === CollectionItemType.notebook
      );
      expect(notebooks).toHaveLength(1);
      expect(notebooks[0].title).toBe('Simple');
      const defaultNotebook = notebooksService.getCurrentNotebook();
      // zipMerge.newItems
      //   .filter(item => item.type !== CollectionItemType.notebook)
      //   .forEach(item => {
      //     expect(item.notebook).toBe(notebooks[0].id);
      //     expect(item.notebook).not.toBe(defaultNotebook);
      //   });
    });

    // TODO 'createNotebook' should be ignored if zip contains notebooks in its metadata
    // TODO if zip meta contains notebooks nested inside folders, what then?

    // TODO test with space
  });
});
