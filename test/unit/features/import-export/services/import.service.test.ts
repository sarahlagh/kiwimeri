import { CollectionItem, CollectionItemType } from '@/collection/collection';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import navService from '@/db/nav.service';
import notebooksService from '@/db/notebooks.service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { userPrefs } from '@/domain/user-preferences/user-preferences.service';
import {
  ZipImportOptions,
  ZipMergeFistLevel,
  ZipMergeResult,
  ZipParseError
} from '@/features/import-export/model/model-import';
import importService from '@/features/import-export/services/import.service';
import { validateMetadataFile } from '@/features/import-export/services/metadata-validation';

import {
  createInitLocalData,
  getLocalItemField,
  getNewContent
} from '@@/_setup/test.utils';
import { readFile } from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type JsonTestDescriptor = {
  zipName?: string;
  ignore?: boolean;
  testCases: {
    zipName?: string;
    description: string;
    ignore?: boolean;
    initData: Pick<
      Partial<CollectionItem>,
      'id' | 'title' | 'type' | 'parent'
    >[];
    commitOptions?: any[];
    scenarios: {
      ignore?: boolean;
      description: string;
      options: ZipImportOptions[];
      mergeInto?: string;
      errors?: ZipParseError[];
      expected: Partial<ZipMergeResult>;
    }[];
  }[];
};

const readZip = async (
  parentDir: string,
  zipName: string,
  opts?: ZipImportOptions
) => {
  const zip = await readFile(`${__dirname}/../_data/${parentDir}/${zipName}`);
  const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
  const unzipped = await importService.readZip(zipBuffer);
  return importService.parseZipData(zipName, unzipped, opts);
};

describe('import service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    userPrefs.set('historyIdleTime', 50);
    historyService['enabled'] = true;
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
      const { doc } = importService.parseNonLexicalContent(
        'This is some content'
      );
      expect(doc).toBeDefined();
      const id = importService.commitDocument(
        doc!,
        DEFAULT_NOTEBOOK_ID,
        'New doc'
      );
      expect(id).toBeDefined();
      expect(collectionService.itemExists(id!)).toBe(true);
      expect(historyService.getVersions(id!)).toHaveLength(1);
    });

    it('overwrite existing document', () => {
      const before = Date.now();
      const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemTitle(id1, 'New doc');
      vi.advanceTimersByTime(5000);

      const { doc } = importService.parseNonLexicalContent(
        'This is some content'
      );
      expect(doc).toBeDefined();
      const id2 = importService.commitDocument(
        doc!,
        DEFAULT_NOTEBOOK_ID,
        'New doc',
        id1
      );
      expect(id2).toBe(id1);
      expect(collectionService.itemExists(id2!)).toBe(true);
      expect(collectionService.getItemField(id2!, 'updated')).toBe(
        before + 5000
      );
      expect(historyService.getVersions(id2!)).toHaveLength(2);
    });

    it('overwrite existing document on historizable field', () => {
      const before = Date.now();
      const id1 = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
      collectionService.setItemLexicalContent(
        id1,
        JSON.parse(getNewContent('new content'))
      );
      vi.advanceTimersByTime(5000);
      expect(historyService.getVersions(id1!)).toHaveLength(2);

      const { doc } = importService.parseNonLexicalContent(
        'This is some content'
      );
      expect(doc).toBeDefined();
      const id2 = importService.commitDocument(
        doc!,
        DEFAULT_NOTEBOOK_ID,
        'New doc',
        id1
      );
      expect(id2).toBe(id1);
      expect(collectionService.itemExists(id2!)).toBe(true);
      expect(collectionService.getItemField(id2!, 'updated')).toBe(
        before + 5000
      );
      expect(historyService.getVersions(id2!)).toHaveLength(3);
    });
  });

  const checkResultsArray = (
    zipMergeArray: (Partial<CollectionItem> | ZipMergeFistLevel)[],
    expectedArray?: (Partial<CollectionItem> | ZipMergeFistLevel)[],
    ids = new Map<string, string>(),
    writeIdsMap = true
  ) => {
    if (expectedArray) {
      if (writeIdsMap) {
        expectedArray.forEach((expectedItem, idx) => {
          if (expectedItem.id) {
            ids.set(expectedItem.id, zipMergeArray[idx].id!);
          }
        });
      }
      expectedArray.forEach((expectedItem, idx) => {
        const mergedItem = zipMergeArray[idx];
        expect(mergedItem.type).toBe(expectedItem.type);
        if (expectedItem.id && !writeIdsMap) {
          expect(mergedItem.id).toBe(
            expectedItem.id.startsWith('#')
              ? ids.get(expectedItem.id)
              : expectedItem.id
          );
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
        }
        if ('updated' in expectedItem) {
          expect((mergedItem as CollectionItem).updated).toBe(
            expectedItem.updated
          );
        }
        if ('tags' in expectedItem) {
          expect((mergedItem as CollectionItem).tags).toEqual(
            expectedItem.tags
          );
        }
        if ('order' in expectedItem) {
          expect((mergedItem as CollectionItem).order).toBe(expectedItem.order);
        }
        if ('settings' in expectedItem) {
          expect((mergedItem as CollectionItem).settings).toEqual(
            expectedItem.settings
          );
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
        expectedItem?.created !== undefined
          ? expectedItem.created >= -1
            ? expectedItem.created
            : collectionService.getItemField(DEFAULT_NOTEBOOK_ID, 'created')
          : updateTs
      );
      expect(item.updated).toBe(
        expectedItem?.updated !== undefined ? expectedItem.updated : updateTs
      );
    });
    zipMerge.updatedItems.forEach((item, idx) => {
      const expectedItem = expected.updatedItems
        ? expected.updatedItems[idx]
        : undefined;
      expect(item.created).toBe(
        expectedItem?.created !== undefined
          ? expectedItem.created > -1
            ? expectedItem.created
            : collectionService.getItemField(DEFAULT_NOTEBOOK_ID, 'created')
          : creationTs
      );
      expect(item.updated).toBe(
        expectedItem?.updated !== undefined ? expectedItem.updated : updateTs
      );
    });
  };

  const checkResultsDb = (
    initData: CollectionItem[],
    zipMerge: ZipMergeResult
  ) => {
    expect(
      localChangesService
        .getLocalChanges()
        .filter(lc => lc.change === LocalChangeType.add)
    ).toHaveLength(zipMerge.newItems.length);
    expect(
      localChangesService
        .getLocalChanges()
        .filter(lc => lc.change === LocalChangeType.delete)
    ).toHaveLength(initData.length - initData.length);
    const items = [...zipMerge.newItems, ...zipMerge.updatedItems];
    items.forEach(item => {
      expect(item.id).toBeDefined();
      expect(collectionService.itemExists(item.id!)).toBe(true);
    });
    zipMerge.newItems
      .filter(item => item.type === CollectionItemType.document)
      .forEach(newDoc => {
        expect(historyService.getVersions(newDoc.id!)).toHaveLength(1);
      });
    zipMerge.updatedItems
      .filter(item => item.type === CollectionItemType.document)
      .forEach(updatedDoc => {
        expect(historyService.getVersions(updatedDoc.id!)).toHaveLength(2);
      });
  };

  const generateTestsCases = async (
    parentDir: string,
    hasMetadata: boolean,
    jsonTestCases: string[]
  ) => {
    for (const jsonName of jsonTestCases) {
      let json = '';
      try {
        json = await readFile(
          `${__dirname}/../_data/${parentDir}/test_descriptors/${jsonName}.json`,
          'utf8'
        );
      } catch (e) {
        continue;
      }
      const testDescriptor: JsonTestDescriptor = JSON.parse(json);
      if (testDescriptor.ignore === true) {
        continue;
      }

      const testName = testDescriptor.zipName ? testDescriptor.zipName : '';
      describe(`should import ${testName}`, () => {
        testDescriptor.testCases
          .filter(testCase => testCase.ignore !== true)
          .filter(testCase => testDescriptor.zipName || testCase.zipName)
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
                            createInitLocalData(testCase.initData);

                          localChangesService.clear();
                          vi.advanceTimersByTime(5000);
                          const updateTs = Date.now();

                          const zipName = testDescriptor.zipName
                            ? testDescriptor.zipName
                            : testCase.zipName;
                          const zipParsedData = await readZip(
                            parentDir,
                            zipName!,
                            options
                          );

                          if (!scenario.errors) {
                            scenario.errors = [];
                          }
                          expect(zipParsedData.errors).toStrictEqual(
                            scenario.errors
                          );

                          if (options.ignoreMetadata === true) {
                            expect(zipParsedData.hasMetadata).toBe(false);
                          } else {
                            expect(zipParsedData.hasMetadata).toBe(hasMetadata);
                          }

                          const zipMerge = importService.mergeZipItems(
                            scenario.mergeInto || DEFAULT_NOTEBOOK_ID,
                            zipParsedData,
                            options
                          );

                          if (scenario.errors.length > 0) {
                            expect(zipMerge).toBeNull();
                            return;
                          }

                          checkResults(
                            zipMerge!,
                            scenario.expected,
                            initDataIds,
                            creationTs,
                            updateTs
                          );

                          // save results and check db
                          importService.commitMergeResult(zipMerge!);

                          checkResultsDb(initialItems, zipMerge!);
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
    await generateTestsCases('zips_without_meta', false, [
      'Simple.zip',
      'SimpleLayer.zip',
      'SimpleWithDuplicates.zip',
      'Samples.zip'
    ]);

    it(`should update parent ts when importing if not home`, async () => {
      const before = Date.now();
      const id = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
      vi.advanceTimersByTime(5000);
      const zipParsedData = await readZip('zips_without_meta', 'Simple.zip');
      const zipMerge = importService.mergeZipItems(id, zipParsedData, {
        createNewFolder: false,
        overwrite: false
      });
      expect(zipMerge).not.toBeNull();
      expect(zipMerge!.newItems).toHaveLength(1);
      expect(zipMerge!.newItems[0].parent).toBe(id);
      // save results and check db
      collectionService.saveItems(zipMerge!.newItems, id);
      expect(getLocalItemField(id, 'updated')).toBe(before + 5000);
    });
  });

  describe('merging zips with metadata', async () => {
    await generateTestsCases('zips_with_meta', true, [
      'Empty.zip',
      'Simple.zip',
      'SimpleLayer.zip',
      'SimpleWithDuplicates.zip',
      'SimpleSub.zip',
      'SimpleSubPartialMeta.zip',
      'SimpleSubPartialFiles.zip',
      'Notebook.zip',
      'Space.zip',
      'SimpleDoc.zip',
      'SpaceMix.zip'
    ]);
  });

  describe('import zip as space', () => {
    let dId: string;
    let fId: string;
    let nId: string;
    beforeEach(() => {
      space.transaction(() => {
        dId = collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
        fId = collectionService.addFolder(DEFAULT_NOTEBOOK_ID);
        nId = notebooksService.addNotebook('Simple');
      });
    });

    function checkCollectionAndHistory(parent: string, expectedLength: number) {
      const allItems = collectionService.getAllCollectionItemsRecursive(parent);
      expect(allItems).toHaveLength(expectedLength);
      const allDocIds = allItems
        .filter(item => item.type === CollectionItemType.document)
        .map(item => item.id);
      allDocIds.forEach(id => {
        expect(historyService.getVersions(id)).toHaveLength(1);
      });
    }

    it('should not restore zip with docs at root', async () => {
      const zipData = await readZip('zips_with_meta', 'SpaceMix.zip', {});
      expect(importService.canRestoreSpace(zipData)).toBe(false);
      expect(importService.restoreSpace(zipData)).toBe(false);
      expect(collectionService.itemExists(dId)).toBe(true);
      expect(collectionService.itemExists(fId)).toBe(true);
      expect(collectionService.itemExists(nId)).toBe(true);
    });

    it('should restore zip without meta', async () => {
      const zipData = await readZip('zips_without_meta', 'Samples.zip', {});
      expect(importService.canRestoreSpace(zipData)).toBe(true);
      expect(importService.restoreSpace(zipData)).toBe(true);
      expect(collectionService.itemExists(dId)).toBe(false);
      expect(collectionService.itemExists(fId)).toBe(false);
      expect(collectionService.itemExists(nId)).toBe(false);
      expect(historyService.getVersions(dId)).toHaveLength(0);
      // expect first folder to be notebook
      expect(notebooksService.getNotebooks()).toHaveLength(1);
      const createdNotebook = notebooksService.getNotebooks()[0];
      expect(createdNotebook.id).toBe(DEFAULT_NOTEBOOK_ID);
      expect(createdNotebook.title).toBe('Samples');
      checkCollectionAndHistory(createdNotebook.id!, 15);
    });

    it('should restore zip with no notebook meta for first level folders and ignore root meta', async () => {
      const zipData = await readZip('zips_with_meta', 'SimpleLayer.zip', {});
      expect(importService.canRestoreSpace(zipData)).toBe(true);
      expect(importService.restoreSpace(zipData)).toBe(true);
      expect(collectionService.itemExists(dId)).toBe(false);
      expect(collectionService.itemExists(fId)).toBe(false);
      expect(collectionService.itemExists(nId)).toBe(false);
      expect(historyService.getVersions(dId)).toHaveLength(0);
      // expect first folder to be notebook
      expect(notebooksService.getNotebooks()).toHaveLength(1);
      const createdNotebook = notebooksService.getNotebooks()[0];
      expect(createdNotebook.id).toBe(DEFAULT_NOTEBOOK_ID);
      expect(createdNotebook.title).toBe('Simple Original');
      checkCollectionAndHistory(createdNotebook.id!, 1);
    });

    it('should restore properly exported zip', async () => {
      const zipData = await readZip('zips_with_meta', 'Space.zip', {});
      expect(importService.canRestoreSpace(zipData)).toBe(true);
      expect(importService.restoreSpace(zipData)).toBe(true);
      expect(collectionService.itemExists(dId)).toBe(false);
      expect(collectionService.itemExists(fId)).toBe(false);
      expect(collectionService.itemExists(nId)).toBe(false);
      expect(historyService.getVersions(dId)).toHaveLength(0);
      // expect first folders to be notebook
      expect(notebooksService.getNotebooks()).toHaveLength(2);
      const createdNotebooks = notebooksService.getNotebooks(ROOT_COLLECTION);
      expect(createdNotebooks[0].title).toBe('SimpleNotebook1');
      expect(createdNotebooks[0].id).toBe(DEFAULT_NOTEBOOK_ID);
      expect(createdNotebooks[1].title).toBe('SimpleNotebook2');
      expect(createdNotebooks[1].id).not.toBe(DEFAULT_NOTEBOOK_ID);
      checkCollectionAndHistory(createdNotebooks[0].id!, 3);
      checkCollectionAndHistory(createdNotebooks[1].id!, 1);
    });

    it('should handle case where default notebook has been changed', async () => {
      navService.setCurrentFolder(nId);
      notebooksService.deleteNotebook(DEFAULT_NOTEBOOK_ID);

      const zipData = await readZip('zips_with_meta', 'Space.zip', {});
      expect(importService.canRestoreSpace(zipData)).toBe(true);
      expect(importService.restoreSpace(zipData)).toBe(true);
      expect(collectionService.itemExists(dId)).toBe(false);
      expect(collectionService.itemExists(fId)).toBe(false);
      expect(collectionService.itemExists(nId)).toBe(false);
      expect(historyService.getVersions(dId)).toHaveLength(0);
      // expect first folders to be notebook
      expect(notebooksService.getNotebooks()).toHaveLength(2);
      const createdNotebooks = notebooksService.getNotebooks(ROOT_COLLECTION);
      expect(createdNotebooks[0].title).toBe('SimpleNotebook1');
      expect(createdNotebooks[0].id).toBe(DEFAULT_NOTEBOOK_ID);
      expect(createdNotebooks[1].title).toBe('SimpleNotebook2');
      expect(createdNotebooks[1].id).not.toBe(DEFAULT_NOTEBOOK_ID);
      checkCollectionAndHistory(createdNotebooks[0].id!, 3);
      checkCollectionAndHistory(createdNotebooks[1].id!, 1);
    });
  });

  describe('import malformed zips', async () => {
    await generateTestsCases('malformed', true, ['Malformed']);

    it('should not restore malformed zip as space', async () => {
      const zipData = await readZip('malformed', 'SpaceMalformed.zip', {});
      expect(importService.canRestoreSpace(zipData)).toBe(false);
      expect(importService.restoreSpace(zipData)).toBe(false);
    });
  });

  describe('parse schema', () => {
    it('should validate empty json', () => {
      expect(() => validateMetadataFile({})).not.toThrow();
    });

    it('should validate partial file', () => {
      expect(() =>
        validateMetadataFile({
          type: CollectionItemType.document
        })
      ).not.toThrow();
      expect(() =>
        validateMetadataFile({
          title: 'test'
        })
      ).not.toThrow();
      expect(() =>
        validateMetadataFile({
          tags: ['test']
        })
      ).not.toThrow();
      expect(() =>
        validateMetadataFile({
          settings: {
            sort: {
              by: 'preview',
              descending: true
            }
          }
        })
      ).not.toThrow();
    });

    it('should ignore unknown fields', () => {
      expect(() =>
        validateMetadataFile({
          notAField: 'yes'
        })
      ).not.toThrow();
    });

    it('should not validate invalid types', () => {
      expect(() => validateMetadataFile('test')).toThrow();
      expect(() => validateMetadataFile(10)).toThrow();
      expect(() => validateMetadataFile(true)).toThrow();
      expect(() => validateMetadataFile([])).toThrow();
      expect(() => validateMetadataFile(null)).toThrow();
    });

    it('should not validate invalid known fields', () => {
      expect(() =>
        validateMetadataFile({
          title: 10
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          type: 'p'
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          tags: 'not an array'
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          tags: null
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          tags: [0, 1, 3]
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          settings: null
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          settings: {}
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          settings: { sort: {} }
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          settings: { sort: { by: 'invalid' } }
        })
      ).toThrow();
      expect(() =>
        validateMetadataFile({
          settings: { sort: { descending: 'ok' } }
        })
      ).toThrow();
    });

    it('should not validate settings with by: order and descending: true', () => {
      expect(() =>
        validateMetadataFile({
          settings: {
            sort: {
              by: 'order',
              descending: true
            }
          }
        })
      ).toThrow();
    });
  });
});
