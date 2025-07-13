import { CollectionItem, CollectionItemType } from '@/collection/collection';
import {
  importService,
  ZipMergeFistLevel,
  ZipMergeOptions,
  ZipMergeResult
} from '@/common/services/import.service';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import { readFile } from 'fs/promises';
import { it, vi } from 'vitest';

type JsonTestDescriptor = {
  zipName: string;
  name: string;
  testCases: {
    description: string;
    initData: Pick<Partial<CollectionItem>, 'title' | 'type'>[];
    scenarios: {
      ignore?: boolean;
      description: string;
      options: ZipMergeOptions[];
      expected: Partial<ZipMergeResult>;
    }[];
  }[];
};

describe('import service', () => {
  describe('finding duplicates', () => {
    it(`should find no duplicates when collection empty`, () => {
      expect(importService.findDuplicates(ROOT_FOLDER, [])).toHaveLength(0);
      expect(
        importService.findDuplicates(ROOT_FOLDER, [
          {
            title: 'test',
            type: CollectionItemType.document
          }
        ])
      ).toHaveLength(0);
    });

    it(`should find no duplicates when inputs do not match title and type`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      collectionService.setItemTitle(docId, 'Test');

      expect(
        importService.findDuplicates(ROOT_FOLDER, [
          {
            title: 'test',
            type: CollectionItemType.document
          }
        ])
      ).toHaveLength(0);

      expect(
        importService.findDuplicates(ROOT_FOLDER, [
          {
            title: 'test',
            type: CollectionItemType.folder
          }
        ])
      ).toHaveLength(0);
    });

    it(`should find no duplicates when inputs do match title but not type`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      collectionService.setItemTitle(docId, 'Test');

      expect(
        importService.findDuplicates(ROOT_FOLDER, [
          {
            title: 'Test',
            type: CollectionItemType.folder
          }
        ])
      ).toHaveLength(0);
    });

    it(`should find a document duplicate when inputs match title and type`, () => {
      const docId = collectionService.addDocument(ROOT_FOLDER);
      collectionService.setItemTitle(docId, 'Test');

      const duplicates = importService.findDuplicates(ROOT_FOLDER, [
        {
          title: 'Test',
          type: CollectionItemType.document
        }
      ]);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].id).toBe(docId);
    });

    it(`should find a folder duplicate when inputs match title and type`, () => {
      const folId = collectionService.addFolder(ROOT_FOLDER);
      collectionService.setItemTitle(folId, 'Test');

      const duplicates = importService.findDuplicates(ROOT_FOLDER, [
        {
          title: 'Test',
          type: CollectionItemType.folder
        }
      ]);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].id).toBe(folId);
    });

    it(`should find multiple duplicates when inputs match title and type`, () => {
      const docId1 = collectionService.addDocument(ROOT_FOLDER);
      collectionService.setItemTitle(docId1, 'Test');

      const docId2 = collectionService.addDocument(ROOT_FOLDER);
      collectionService.setItemTitle(docId2, 'Test');

      const folId1 = collectionService.addFolder(ROOT_FOLDER);
      collectionService.setItemTitle(folId1, 'Test');

      const folId2 = collectionService.addFolder(ROOT_FOLDER);
      collectionService.setItemTitle(folId2, 'Test 2');

      const duplicates = importService.findDuplicates(ROOT_FOLDER, [
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

  const readZip = async (zipName: string) => {
    const zip = await readFile(`${__dirname}/zips/${zipName}`);
    const zipBuffer: ArrayBuffer = new Uint8Array(zip).buffer;
    const unzipped = await importService.readZip(zipBuffer);
    return importService.parseZipData(ROOT_FOLDER, unzipped).items;
  };

  describe('merging items', async () => {
    const jsonTestCases = ['Simple.zip'];

    const createInitData = (initData: Partial<CollectionItem>[]) => {
      const ids = new Map<string, string>();

      const createItem = (
        item: CollectionItem,
        data: Partial<CollectionItem>
      ) => {
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
          const { item, id } = collectionService.getNewDocumentObj(ROOT_FOLDER);
          return createItem({ ...item, id }, data);
        } else if (data.type === CollectionItemType.folder) {
          const { item, id } = collectionService.getNewFolderObj(ROOT_FOLDER);
          return createItem({ ...item, id }, data);
        }
        throw new Error('unsupported type in test');
      });
      console.log('initial items', initialItems);
      if (initialItems.length > 0) {
        collectionService.saveItems(initialItems, ROOT_FOLDER);
      }
      return ids;
    };

    const checkResultsArray = (
      zipMergeArray: (Partial<CollectionItem> | ZipMergeFistLevel)[],
      expectedArray?: (Partial<CollectionItem> | ZipMergeFistLevel)[],
      ids = new Map<string, string>(),
      writeIdsMap = true
    ) => {
      if (expectedArray) {
        expectedArray.forEach((expectedItem, idx) => {
          const mergedItem = zipMergeArray[idx];
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
          }
          if ('status' in expectedItem) {
            expect((mergedItem as ZipMergeFistLevel).status).toBe(
              expectedItem.status
            );
          }
          expect(mergedItem.title).toBe(expectedItem.title);
          expect(mergedItem.type).toBe(expectedItem.type);
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
      expect(zipMerge.duplicates).toHaveLength(
        expected.duplicates?.length || 0
      );
      expect(zipMerge.newItems).toHaveLength(expected.newItems?.length || 0);
      expect(zipMerge.firstLevel).toHaveLength(
        expected.firstLevel?.length || 0
      );

      const newItemsIds = checkResultsArray(
        zipMerge.newItems,
        expected.newItems
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
      zipMerge.newItems.forEach(item => {
        expect(item.created).toBe(updateTs);
        expect(item.updated).toBe(updateTs);
      });
      zipMerge.updatedItems.forEach(item => {
        expect(item.created).toBe(creationTs);
        expect(item.updated).toBe(updateTs);
      });
    };

    for (const jsonName of jsonTestCases) {
      const json = await readFile(`${__dirname}/zips/${jsonName}.json`, 'utf8');
      const testDescriptor: JsonTestDescriptor = JSON.parse(json);

      describe(`should import ${testDescriptor.zipName}`, () => {
        testDescriptor.testCases.forEach(testCase => {
          describe(`${testCase.description}`, () => {
            testCase.scenarios
              .filter(scenario => scenario.ignore !== true)
              .forEach(scenario => {
                describe(`${scenario.description}`, () => {
                  beforeEach(() => {
                    vi.useFakeTimers();
                  });
                  afterEach(() => {
                    vi.useRealTimers();
                  });
                  scenario.options.forEach((options, oIdx) => {
                    it(`and options #${oIdx}`, async () => {
                      console.log('options', options);

                      const creationTs = Date.now();
                      const initDataIds = createInitData(testCase.initData);
                      vi.advanceTimersByTime(5000);
                      const updateTs = Date.now();

                      const zipContent = await readZip(testDescriptor.zipName);

                      const zipMerge =
                        importService.mergeZipItemsWithCollection(
                          testDescriptor.name,
                          zipContent,
                          ROOT_FOLDER,
                          options
                        );

                      checkResults(
                        zipMerge,
                        scenario.expected,
                        initDataIds,
                        creationTs,
                        updateTs
                      );
                    });
                  });
                });
              });
          });
        });
      });
    }

    it.todo(`should update parent ts when importing if not home`, () => {
      // TODO
    });
  });
});
