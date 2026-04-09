import {
  CollectionItem,
  CollectionItemType,
  isPageOrDocument,
  parseFieldMeta
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import {
  CONFLICTS_NOTEBOOK_ID,
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  ROOT_COLLECTION
} from '@/constants';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import notebooksService from '@/db/notebooks.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import tagsService from '@/db/tags.service';
import { SpaceValues } from '@/db/types/space-types';
import { LocalChangeType } from '@/db/types/store-types';
import userSettingsService from '@/db/user-settings.service';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { LayerTypes } from '@/remote-storage/storage-filesystem.factory';
import { syncService } from '@/remote-storage/sync.service';
import { searchAncestryService } from '@/search/search-ancestry.service';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONFLICT_CHANGES,
  countOrphans,
  expectHasLocalItemConflict,
  fakeTimersDelay,
  GET_ALL_CHANGES,
  GET_CONFLICT_CHANGES,
  GET_NON_CONFLICT_CHANGES,
  GET_NON_PARENT_UPDATABLE_FIELDS,
  GET_UPDATABLE_FIELDS,
  getDocsFolders,
  getLocalItemConflict,
  getLocalItemConflicts,
  getLocalItemField,
  getNewValue,
  getRemoteItemField,
  getRowCountInsideNotebook,
  getRowIdsInsideNotebook,
  NON_NOTEBOOK_BROWSABLE_ITEM_TYPES,
  NON_NOTEBOOK_ITEM_TYPES,
  oneDocument,
  oneFolder,
  oneNotebook,
  setLocalItemField,
  updateOnRemote
} from '../../setup/test.utils';

let driver: InMemDriver;
let iPull = 0;
let iPush = 0;

const defaultValues: SpaceValues = {
  defaultSortBy: 'order',
  defaultSortDesc: true,
  historyIdleTime: 15000,
  historyMaxInterval: 300000,
  maxHistoryPerDoc: 50,
  lastUpdated: Date.now(),
  schemaVersion: ''
};

const reInitRemoteData = async (
  items: CollectionItem[],
  updateTs?: number,
  values?: SpaceValues
) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  // parent update doesn't set the row update ts, so... parent_meta ts might be > i.updated
  // this is a test problem, lastLocalChange is supposed to be updated by localChanges service
  const lastLocalChange =
    updateTs !== undefined
      ? updateTs
      : Math.max(
          ...items.map(i =>
            Math.max(i.updated, parseFieldMeta(i.parent_meta).u)
          )
        );
  if (!values) {
    values = {
      ...defaultValues,
      defaultSortBy: 'created',
      defaultSortDesc: false,
      lastUpdated: 0
    };
  }
  console.debug('[reInitRemoteData]', items, values, lastLocalChange);
  await driver.setContent(items, values, lastLocalChange);
  vi.advanceTimersByTime(fakeTimersDelay);
};

const syncService_pull = async (force = false) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pulling', ++iPull, Date.now());
  const ok = await syncService.pull(undefined, force);
  expect(ok).toBe(true);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pulling', Date.now());
};

const syncService_push = async (force = false) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pushing', ++iPush, Date.now());
  await syncService.push(undefined, force);
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pushing', Date.now());
};

const collectionService_addFolder = (parent: string) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  collectionService.addFolder(parent);
  vi.advanceTimersByTime(fakeTimersDelay);
};

const collectionService_addDocument = (parent: string) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  const id = collectionService.addDocument(parent);
  vi.advanceTimersByTime(fakeTimersDelay);
  return id;
};

const collectionService_deleteItem = (id: string) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  collectionService.deleteItem(id);
  vi.advanceTimersByTime(fakeTimersDelay);
};

const testPushIndicator = (res: boolean) => {
  const { result } = renderHook(() => syncService.usePrimaryHasLocalChanges());
  expect(result.current).toBe(res);
};

const getSomeRemoteData = (
  type: string,
  testAddFn: (title?: string, parent?: string) => CollectionItem
) => {
  const aDoc = oneDocument('r2');
  return [
    testAddFn('r1', type === 'page' ? aDoc.id! : DEFAULT_NOTEBOOK_ID),
    aDoc,
    oneDocument('r3'),
    oneFolder('r4'),
    oneNotebook()
  ];
};

const checkHistory = (
  nbOfDocuments: number,
  expectedVersions: number | number[] = 1,
  notebook = DEFAULT_NOTEBOOK_ID
) => {
  const items = collectionService.getAllCollectionItemsRecursive(notebook, {
    by: 'title',
    descending: false
  });
  let count = 0;
  const nb = Array.isArray(expectedVersions) ? expectedVersions : [];
  const docs = items.filter(r => r.type === CollectionItemType.document);
  console.log(
    '[checkHistory] expected',
    nb,
    'got',
    docs.map(d => `{${d.title}, ${historyService.getVersions(d.id!).length}}`)
  );
  docs.forEach(doc => {
    expect(historyService.getVersions(doc.id!)).toHaveLength(
      nb.length > 0 ? nb[count] : (expectedVersions as number)
    );
    count++;
  });
  expect(count).toBe(nbOfDocuments);
};

describe('sync service', () => {
  // [{ layer: 'singlefile' } /*, { layer: 'bucket' } */].forEach(({ layer }) => {
  const layer = 'singlefile';
  describe(`with ${layer} layer`, () => {
    beforeEach(async () => {
      remotesService['layer'] = layer as LayerTypes;
      remotesService.addRemote('test', 0, 'inmem', {});
      await remotesService.configureRemotes(storageService.getSpaceId(), true);
      driver = remotesService['filesystems'].values().next().value![
        'driver'
      ] as InMemDriver;
      vi.useFakeTimers();
      searchAncestryService.start(DEFAULT_SPACE_ID);
      historyService['enabled'] = true;
    });
    afterEach(() => {
      expect(countOrphans()).toBe(0);
      iPull = 0;
      iPush = 0;
      vi.useRealTimers();
      searchAncestryService.stop();
    });

    describe.skip('on pull operation', () => {
      it('should pull new remote items without erasing newly created items', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        // create local items
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(2);
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(5);
        expect(getLocalItemConflicts()).toHaveLength(0);
        checkHistory(3);

        // indicator should still tell if push allowed
        testPushIndicator(true);
      });

      it('should pull new remote items without erasing existing items, unless local changes cleared', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        // create local items
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(2);
        checkHistory(1);

        localChangesService.clear();
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(3);
        checkHistory(2);

        // indicator should still tell if push allowed
        testPushIndicator(false);
      });

      it('should pull new remote items several times without erasing newly created items ', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        // create local items
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(1);
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(4);
        expect(getLocalItemConflicts()).toHaveLength(0);
        checkHistory(3);

        // update remote again
        await reInitRemoteData([...remoteData, oneDocument('r4')]);
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(5);
        expect(getLocalItemConflicts()).toHaveLength(0);
        checkHistory(4);

        // indicator should still tell if push allowed
        testPushIndicator(true);
      });

      it(`should erase existing items if they have been pushed, when changing remote`, async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);

        // create local items
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(2);
        localChangesService.clear(); // clear changes -> it's like they have been pushed

        // pull items from new remote
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(3);
        checkHistory(2);

        testPushIndicator(false);
      });

      it(`should not leave orphans if delete folder on remote but add document on local`, async () => {
        // init data
        const folder = oneFolder('r1');
        const docInside = oneDocument('r2', folder.id);
        const remoteData = [folder, docInside, oneNotebook()];
        await reInitRemoteData(remoteData);
        await syncService_pull();

        // delete folder on remote
        await reInitRemoteData([remoteData[2]]);

        // add doc on local
        const newDocId = collectionService_addDocument(folder.id!);

        // pull
        await syncService_pull();

        expect(getLocalItemConflicts()).toHaveLength(1);
        expect(collectionService.itemExists(newDocId)).toBe(true);
        expect(collectionService.getItemParent(newDocId)).toBe(
          CONFLICTS_NOTEBOOK_ID
        );
        expect(collectionService.isItemConflict(newDocId)).toBe(true);
        expect(collectionService.itemExists(folder.id!)).toBe(false);
        expect(collectionService.itemExists(docInside.id!)).toBe(false);
        expect(getRowCountInsideNotebook()).toBe(0);
        expect(getRowCountInsideNotebook(CONFLICTS_NOTEBOOK_ID)).toBe(1);
        checkHistory(0); // no version for conflicts
      });

      it(`should not leave orphans if delete folder on remote but update document inside on local`, async () => {
        // init data
        const folder = oneFolder('r1');
        const docInside = oneDocument('r2', folder.id);
        const remoteData = [folder, docInside, oneNotebook()];
        await reInitRemoteData(remoteData);
        await syncService_pull();

        // delete folder on remote
        await reInitRemoteData([remoteData[2]]);

        // update doc on local
        setLocalItemField(docInside.id!, 'title', ROOT_COLLECTION);

        // pull
        await syncService_pull();

        expect(getLocalItemConflicts()).toHaveLength(1);
        expect(collectionService.itemExists(folder.id!)).toBe(false);
        expect(collectionService.itemExists(docInside.id!)).toBe(true);
        expect(collectionService.isItemConflict(docInside.id!)).toBe(true);
        expect(collectionService.getItemParent(docInside.id!)).toBe(
          CONFLICTS_NOTEBOOK_ID
        );
        expect(getRowCountInsideNotebook()).toBe(0);
        expect(getRowCountInsideNotebook(CONFLICTS_NOTEBOOK_ID)).toBe(1);
        checkHistory(0);
      });

      // TODO same tests in inverse order (add doc local first, then delete folder)

      it(`should not leave orphans if delete folder on local but add document on remote`, async () => {
        // init data
        const folder = oneFolder('r1');
        const docInside = oneDocument('r2', folder.id);
        const remoteData = [folder, docInside, oneNotebook()];
        await reInitRemoteData(remoteData);
        await syncService_pull();

        // delete folder on local
        collectionService_deleteItem(folder.id!);

        // add doc on remote
        const newDocOnRemote = oneDocument('r3', folder.id);
        await reInitRemoteData([newDocOnRemote, ...remoteData]);

        // pull
        await syncService_pull();

        expect(collectionService.itemExists(newDocOnRemote.id!)).toBe(true);
        expect(collectionService.isItemConflict(newDocOnRemote.id!)).toBe(true);
        expect(collectionService.getItemParent(newDocOnRemote.id!)).toBe(
          CONFLICTS_NOTEBOOK_ID
        );
        expect(collectionService.itemExists(folder.id!)).toBe(false);
        expect(collectionService.itemExists(docInside.id!)).toBe(false);

        checkHistory(0); // no version for conflict
      });

      NON_NOTEBOOK_ITEM_TYPES.forEach(({ type, typeVal, testAddFn }) => {
        describe(`tests on a ${type}`, () => {
          it(`should delete local ${type}s on pull if they have not been changed and erased on remote`, async () => {
            localChangesService.clear();
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

            // erase on remote
            await reInitRemoteData(remoteData.slice(1));
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);
            testPushIndicator(false);

            if (isPageOrDocument({ type: typeVal })) {
              const versions = historyService.getVersions(remoteData[0].id!);
              expect(versions).toHaveLength(2); // versions are not deleted, but left to gc (gives a chance to restore it)
              expect(versions[0].op).toBe('deleted');

              if (type === 'page') {
                const versions = historyService.getVersions(
                  remoteData[0].parent!
                );
                expect(versions).toHaveLength(2); // versions are not deleted, but left to gc (gives a chance to restore it)
                expect(versions[0].op).toBe('snapshot');
              }
            }
            checkHistory(2, type === 'page' ? [2, 1] : 1); // getSomeRemoteData creates 3 docs (minus the first deleted) or 2
          });

          it(`should not recreate ${type}s erased locally on pull if they have not changed on remote`, async () => {
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
            checkHistory(type === 'document' ? 3 : 2);

            // erase locally
            const id = remoteData[0].id!;
            collectionService_deleteItem(id);

            // pull again
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);

            testPushIndicator(true);
            checkHistory(2, type === 'page' ? [2, 1] : 1);
          });

          GET_UPDATABLE_FIELDS(type).forEach(({ field, valueType }) => {
            it(`should pull updates on second pull if remote ${type} has been updated with ${field}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;
              const newValue = getNewValue(valueType, remoteData[3].id);
              // change remote
              updateOnRemote(remoteData, id, field, newValue);
              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(collectionService.itemExists(id!)).toBeTruthy();
              expect(getLocalItemField(id!, field)).toBe(newValue);

              let nbVersions = 1;
              if (collectionService.isHistorizableContentChange(typeVal, field))
                nbVersions++;
              checkHistory(type === 'document' ? 3 : 2, [nbVersions, 1, 1]);
            });

            it(`should not delete local updates of field ${field} if they have not changed on remote ${type}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              // update locally
              const id = remoteData[0].id!;
              const newValue = getNewValue(valueType, remoteData[2].id);
              setLocalItemField(id, field, newValue);

              // pull again
              await syncService_pull();
              expect(getLocalItemField(id, field)).toBe(newValue);
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              testPushIndicator(true);
              checkHistory(type === 'document' ? 3 : 2);
            });

            it(`should not delete local ${type}s on pull if they have been changed with ${field} after being erased on remote`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              checkHistory(type === 'document' ? 3 : 2, 1);
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;

              // erase on remote
              await reInitRemoteData(remoteData.slice(1), Date.now());

              // update locally
              const newValue = getNewValue(valueType, remoteData[3].id);
              setLocalItemField(id, field, newValue);
              historyService.saveNow();
              const nbVersions = collectionService.isHistorizableContentChange(
                typeVal,
                field
              )
                ? 2
                : 1;
              checkHistory(type === 'document' ? 3 : 2, [nbVersions, 1, 1]);

              await syncService_pull();

              // item is unchanged
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemConflicts()).toHaveLength(0);
              expect(getLocalItemField(id, field)).toBe(newValue);
              testPushIndicator(true);
              checkHistory(type === 'document' ? 3 : 2, [nbVersions, 1, 1]);
            });

            it(`should not recreate ${type}s erased locally on pull if they have changed on remote with ${field} before delete`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;
              // update on remote
              const newValue = getNewValue(valueType);
              updateOnRemote(remoteData, id, field, newValue);
              await reInitRemoteData(remoteData);

              // erase locally
              collectionService_deleteItem(id);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);
              expect(collectionService.itemExists(id)).toBeFalsy();

              testPushIndicator(true);
              checkHistory(2, type === 'page' ? [2, 1] : 1);
            });
          });

          GET_NON_PARENT_UPDATABLE_FIELDS(type).forEach(
            ({ field, valueType }) => {
              it(`should recreate ${type}s erased locally on pull if they have changed on remote with ${field} after delete`, async () => {
                const remoteData = getSomeRemoteData(type, testAddFn);
                await reInitRemoteData(remoteData);
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

                const id = remoteData[0].id!;
                // erase locally
                collectionService_deleteItem(id);

                // update on remote
                const newValue = getNewValue(valueType);
                updateOnRemote(remoteData, id, field, newValue);
                await reInitRemoteData(remoteData);

                // pull again
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
                expect(getLocalItemConflicts()).toHaveLength(0);
                expect(getLocalItemField(id, field)).toBe(newValue);

                testPushIndicator(true);
                if (type === 'document') {
                  checkHistory(3, [3, 1, 1]);
                  const versions = historyService.getVersions(id);
                  expect(versions[0].op).toBe('snapshot');
                  expect(versions[1].op).toBe('deleted');
                } else if (type === 'page') {
                  checkHistory(2, [3, 1]);
                  const docId = remoteData[0].parent;
                  // page has been recreated and is visible on the document
                  expect(
                    collectionService
                      .getDocumentPages(docId)
                      .find(p => p.id === id)
                  ).toBeDefined();
                  // a new version of the document has been created to reflect that
                  const docVersions = historyService.getVersions(docId);
                  expect(
                    docVersions[0].pageVersionsArrayJson?.find(
                      pv => pv.itemId === id
                    )
                  ).toBeDefined();
                  const versions = historyService.getVersions(id);
                  expect(versions[0].op).toBe('snapshot');
                  expect(versions[1].op).toBe('deleted');
                } else {
                  // folder
                  checkHistory(2, 1);
                }
              });
            }
          );

          // for folders, delete action takes precedence over the timestamp
          it(`should not recreate ${type}s erased locally on pull if they have changed on remote with parent after delete`, async () => {
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

            const id = remoteData[0].id!;
            // erase locally
            collectionService_deleteItem(id);

            // update on remote
            updateOnRemote(remoteData, id, 'parent', remoteData[3].id!);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);
            expect(collectionService.itemExists(id)).toBe(false);

            testPushIndicator(true);
            checkHistory(2, type === 'page' ? [2, 1] : 1);
          });

          // fields that can change: parent, title, content, deleted
          GET_NON_CONFLICT_CHANGES(type).forEach(
            ({ local, localValueType, remote, remoteValueType }) => {
              it(`should merge changes on ${type} without conflict if localChange=${local} then remoteChange=${remote}`, async () => {
                const remoteData = [
                  ...getSomeRemoteData(type, testAddFn),
                  oneDocument('r9') // idx 5
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull(); // 1
                const id = remoteData[0].id!;
                checkHistory(type === 'document' ? 4 : 3, 1);
                let nbVersions = 1;
                if (
                  collectionService.isHistorizableContentChange(typeVal, local)
                )
                  nbVersions++;

                // change local
                const newLocalValue = getNewValue(
                  localValueType,
                  type === 'document' ? remoteData[3].id : remoteData[5].id
                );
                setLocalItemField(id, local, newLocalValue);
                historyService.saveNow();
                checkHistory(type === 'document' ? 4 : 3, [
                  nbVersions,
                  1,
                  1,
                  1
                ]);

                // change remote
                const newRemoteValue = getNewValue(
                  remoteValueType,
                  remoteData[2].id
                );
                updateOnRemote(remoteData, id, remote, newRemoteValue);
                await reInitRemoteData(remoteData);

                // pull again
                await syncService_pull(); // 2

                // no conflict created
                expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
                expect(getLocalItemConflicts()).toHaveLength(0);
                expect(getLocalItemField(id, remote)).toBe(newRemoteValue);
                if (remote !== local) {
                  expect(getLocalItemField(id, local)).toBe(newLocalValue);
                }
                const r9WasUpdatedToo = type === 'page' && local === 'parent';
                if (
                  collectionService.isHistorizableContentChange(
                    typeVal,
                    remote
                  ) &&
                  remote !== local &&
                  !r9WasUpdatedToo
                )
                  nbVersions++;
                checkHistory(type === 'document' ? 4 : 3, [
                  nbVersions,
                  1,
                  r9WasUpdatedToo ? 2 : 1, // if page, parent[5](r9) was updated too
                  1
                ]);
              });

              it(`should merge changes on ${type} without conflict if remoteChange=${remote} then localChange=${local}`, async () => {
                const remoteData = [
                  ...getSomeRemoteData(type, testAddFn),
                  oneDocument('r9') // idx 5
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull();
                const id = remoteData[0].id!;

                // change remote
                const newRemoteValue = getNewValue(
                  remoteValueType,
                  remoteData[3].id
                );
                updateOnRemote(remoteData, id, remote, newRemoteValue);
                await reInitRemoteData(remoteData);

                let nbVersions = 1;
                if (
                  collectionService.isHistorizableContentChange(typeVal, local)
                )
                  nbVersions++;

                // change local
                const newLocalValue = getNewValue(
                  localValueType,
                  type === 'document' ? remoteData[2].id : remoteData[5].id
                  // remoteData[2].id
                ); // note: can create a document with document as parent - messes up the history!!
                setLocalItemField(id, local, newLocalValue);
                historyService.saveNow();

                // pull again
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
                expect(getLocalItemField(id, local)).toBe(newLocalValue);
                if (local !== remote) {
                  expect(getLocalItemField(id, remote)).toBe(newRemoteValue);
                }

                testPushIndicator(true);

                const r9WasUpdatedToo = type === 'page' && local === 'parent';
                if (
                  remote !== local &&
                  collectionService.isHistorizableContentChange(
                    typeVal,
                    remote
                  ) &&
                  !r9WasUpdatedToo
                )
                  nbVersions++;

                checkHistory(type === 'document' ? 4 : 3, [
                  nbVersions,
                  1,
                  r9WasUpdatedToo ? 2 : 1, // if page, parent[5](r9) was updated too
                  1
                ]);
                // checkHistory(type === 'document' ? 4 : 3, [nbVersions, 1, 1]);
              });
            }
          );

          GET_CONFLICT_CHANGES(type).forEach(({ field, valueType }) => {
            it(`should apply local change on ${type} when remoteChange=${field} then localChange=${field} (local wins)`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change remote
              const newRemoteValue = getNewValue(valueType, remoteData[3].id);
              updateOnRemote(remoteData, id, field, newRemoteValue);
              await reInitRemoteData(remoteData);

              // change local
              const newLocalValue = getNewValue(valueType, remoteData[2].id);
              setLocalItemField(id, field, newLocalValue);
              historyService.saveNow();
              const nbVersions = collectionService.isHistorizableContentChange(
                typeVal,
                field
              )
                ? 2
                : 1;
              checkHistory(type === 'document' ? 3 : 2, [nbVersions, 1, 1]);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemField(id, field)).toBe(newLocalValue);

              testPushIndicator(true);
              checkHistory(type === 'document' ? 3 : 2, [nbVersions, 1, 1]);
            });
          });

          if (type === 'document' || type === 'page') {
            it(`should update preview on ${type} when remote content has changed`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              const id = remoteData[0].id!;
              expect(searchAncestryService.getItemPreview(id)).toHaveLength(0);

              // change remote
              const newContent = getNewValue('lex') as string;
              updateOnRemote(remoteData, id, 'content', newContent);
              await reInitRemoteData(remoteData);

              await syncService_pull(); // 2

              expect(getLocalItemField(id, 'content')).toBe(newContent);
              expect(searchAncestryService.getItemPreview(id)).toMatch(
                /^Sample text/g
              );
              checkHistory(type === 'document' ? 3 : 2, [2, 1, 1]);
            });
          }

          if (type === 'document') {
            GET_CONFLICT_CHANGES(type).forEach(({ field, valueType }) => {
              it(`should create conflict for documents on pull if they have been changed with ${field} before being erased on remote`, async () => {
                const remoteData = [
                  oneDocument('r1'),
                  oneDocument('r2'),
                  oneFolder('r3'),
                  oneNotebook()
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(3);

                // update locally
                const id = remoteData[0].id!;
                const newValue = getNewValue(valueType, remoteData[2].id);
                setLocalItemField(id, field, newValue);
                vi.advanceTimersByTime(50);
                historyService.saveNow();

                // erase on remote
                await reInitRemoteData(
                  [remoteData[1], remoteData[2], remoteData[3]],
                  Date.now()
                );
                await syncService_pull();

                // conflict has been created
                expect(getRowCountInsideNotebook()).toBe(3);
                expect(getLocalItemConflicts()).toHaveLength(1);
                expect(collectionService.itemExists(id)).toBeFalsy();

                const conflictId = getLocalItemConflict()!;
                expect(getLocalItemField(conflictId, field)).toBe(newValue);
                testPushIndicator(true); // TODO: ideally, should be false

                // no version for the conflict
                expect(collectionService.itemExists(id)).toBeFalsy();
                let oldDocVersions = historyService.getVersions(id);
                expect(oldDocVersions[0].op).toBe('deleted');
                let conflictVersions = historyService.getVersions(conflictId);
                expect(conflictVersions).toHaveLength(0);

                // push, no conflict should be pushed
                await syncService_push();
                let remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(3);
                testPushIndicator(false);

                // now, solve conflict
                setLocalItemField(conflictId, 'content', getNewValue('lex'));
                historyService.saveNow();
                testPushIndicator(true);
                expect(getLocalItemConflicts()).toHaveLength(0);
                // !! once conflict solved, should have one version

                await syncService_push();
                remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(4);

                testPushIndicator(false);

                // old doc erased should have still versions
                expect(collectionService.itemExists(id)).toBeFalsy();
                oldDocVersions = historyService.getVersions(id);
                expect(oldDocVersions[0].op).toBe('deleted');

                // new conflict should exist with a new version
                conflictVersions = historyService.getVersions(conflictId);
                expect(conflictVersions).toHaveLength(1);
                expect(conflictVersions[0].op).toBe('snapshot');
              });

              it(`should create conflict for documents if localChange=${field} then remoteChange=${field}`, async () => {
                const folder1 = oneFolder('r3');
                const folder2 = oneFolder('r4');
                const remoteData = [
                  oneDocument('r1'),
                  oneDocument('r2'),
                  folder1,
                  folder2,
                  oneNotebook()
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull(); // 1
                const id = remoteData[0].id!;

                // change local
                const newLocalValue = getNewValue(valueType, folder1.id);
                setLocalItemField(id, field, newLocalValue); // real id to avoid problem when field=parent
                historyService.saveNow();

                // change remote
                const newRemoteValue = getNewValue(valueType, folder2.id);
                updateOnRemote(remoteData, id, field, newRemoteValue);
                await reInitRemoteData(remoteData);

                // pull again
                await syncService_pull(); // 2
                // a conflict file was created
                expect(getRowCountInsideNotebook()).toBe(5);
                expect(getLocalItemField(id, field)).toBe(newRemoteValue);
                expect(getLocalItemField(id, field)).not.toBe(newLocalValue);
                const docVersions = historyService.getVersions(id);
                const nbVersions =
                  collectionService.isHistorizableContentChange('d', field)
                    ? 2
                    : 1;
                expect(docVersions).toHaveLength(nbVersions);
                expect(docVersions[0].op).toBe('snapshot');

                // check that a conflict file exists
                const conflictId = getLocalItemConflict();
                expect(conflictId).toBeDefined();
                let conflictVersions = historyService.getVersions(conflictId!);
                expect(conflictVersions).toHaveLength(0);
                testPushIndicator(true);

                // pull again
                await syncService_pull(); // 3
                // conflict was untouched
                expect(getRowCountInsideNotebook()).toBe(5);
                expectHasLocalItemConflict(conflictId!, true);

                // update the conflict => will remove its 'conflict' flag
                setLocalItemField(
                  conflictId!,
                  'title',
                  'conflict file updated only'
                );
                historyService.saveNow();
                expect(getRowCountInsideNotebook()).toBe(5);
                expect(localChangesService.getLocalChanges()).toHaveLength(3);
                const lc = localChangesService
                  .getLocalChanges()
                  .find(lc => lc.item === conflictId);
                expect(lc).toBeDefined();
                expect(lc!.change).toBe(LocalChangeType.add);
                // after update, conflict is no longer one
                expect(collectionService.itemExists(conflictId!)).toBeTruthy();
                expect(
                  collectionService.isItemConflict(conflictId!)
                ).toBeFalsy();
                conflictVersions = historyService.getVersions(conflictId!);
                expect(conflictVersions).toHaveLength(1);
                expect(conflictVersions[0].op).toBe('snapshot');

                // pull again
                await syncService_pull(); // 4
                // nothing new
                expect(getLocalItemConflict()).toBeUndefined();
                expect(getRowCountInsideNotebook()).toBe(5);
                expect(getLocalItemField(id, field)).toBe(newRemoteValue);
                expect(getLocalItemField(id, field)).not.toBe(newLocalValue);
                expect(historyService.getVersions(id)).toHaveLength(nbVersions);

                // solve the conflict at last... wdym, past-self?
                expect(collectionService.itemExists(id)).toBeTruthy();
                setLocalItemField(id, 'tags', 'conflict updated'); // cache
                historyService.saveNow(); // tags is a historizable change
                expect(historyService.getVersions(id)).toHaveLength(
                  nbVersions + 1
                );

                // pull again
                await syncService_pull(); // 5
                expect(getRowCountInsideNotebook()).toBe(5);
                expect(collectionService.itemExists(conflictId!)).toBeTruthy();

                expect(historyService.getVersions(id)).toHaveLength(
                  nbVersions + 1
                );
              });
            });

            it('should handle multiple merge on one document without conflict', async () => {
              const remoteData = [
                oneDocument('r1'),
                oneDocument('r2'),
                oneFolder('3'),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              const id = remoteData[0].id!;

              // change remote
              const newRemoteTitle = getNewValue('string');
              const newRemoteContent = getNewValue('lex');
              updateOnRemote(remoteData, id, 'content', newRemoteContent);
              updateOnRemote(remoteData, id, 'title', newRemoteTitle);

              // change local
              const newLocalTitle = getNewValue('string');
              const newLocalTags = getNewValue('string');
              setLocalItemField(id, 'title', newLocalTitle);
              setLocalItemField(id, 'tags', newLocalTags);
              historyService.saveNow();
              expect(historyService.getVersions(id)).toHaveLength(2);

              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull(); // 2
              // no conflict created
              expect(getRowCountInsideNotebook()).toBe(3);
              expect(getLocalItemConflicts()).toHaveLength(0);
              expect(getLocalItemField(id, 'title')).toBe(newLocalTitle);
              expect(getLocalItemField(id, 'tags')).toBe(newLocalTags);
              expect(getLocalItemField(id, 'content')).toBe(newRemoteContent);
              checkHistory(2, [3, 1]);
            });

            it('should handle multiple merge on one document with conflict', async () => {
              const remoteData = [
                oneDocument('r1'),
                oneDocument('r2'),
                oneFolder('r3'),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              const id = remoteData[0].id!;

              // change local
              setLocalItemField(id, 'title', 'r9');
              setLocalItemField(id, 'tags', ROOT_COLLECTION);
              historyService.saveNow();

              // change remote
              const newRemoteTitle = 'r0';
              const newRemoteContent = getNewValue('lex');
              updateOnRemote(remoteData, id, 'content', newRemoteContent);
              updateOnRemote(remoteData, id, 'title', newRemoteTitle);

              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull(); // 2

              expect(historyService.getVersions(id)).toHaveLength(3);
              // a conflict is created due to title field
              expect(getRowCountInsideNotebook()).toBe(4);
              expect(getLocalItemConflicts()).toHaveLength(1);
              expect(getLocalItemField(id, 'title')).toBe(newRemoteTitle);
              expect(getLocalItemField(id, 'tags')).toBe(ROOT_COLLECTION);
              expect(getLocalItemField(id, 'content')).toBe(newRemoteContent);
              checkHistory(3, [3, 1, 0]); // r0, r2, r9 (conflict)
            });
          }

          if (type === 'folder') {
            GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
              it(`should not create conflict for folders on pull if they have been changed with ${field} before being erased on remote (remote wins)`, async () => {
                const folder = oneFolder('r1');
                const remoteData = [
                  folder,
                  oneDocument('r2', folder.id!),
                  oneFolder('r3'),
                  oneNotebook()
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(3);

                // update locally
                const id = remoteData[0].id!;
                setLocalItemField(id, field, ROOT_COLLECTION);
                vi.advanceTimersByTime(50);

                // erase on remote
                await reInitRemoteData(
                  [remoteData[2], remoteData[3]],
                  Date.now()
                );
                await syncService_pull();

                // no conflict has been created
                expect(getRowCountInsideNotebook()).toBe(1);
                expect(getLocalItemConflicts()).toHaveLength(0);
                expect(
                  collectionService.itemExists(remoteData[0].id!)
                ).toBeFalsy();
                expect(
                  collectionService.itemExists(remoteData[1].id!)
                ).toBeFalsy();
                expect(
                  collectionService.itemExists(remoteData[2].id!)
                ).toBeTruthy();

                testPushIndicator(true); // not ideal

                // now push
                await syncService_push();
                const remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(2);
                testPushIndicator(false);
              });
            });

            GET_CONFLICT_CHANGES(type).forEach(({ field, valueType }) => {
              it(`should not create conflict for folders if localChange=${field} then remoteChange=${field} (remote wins)`, async () => {
                const remoteData = [
                  oneFolder(),
                  oneDocument(),
                  oneFolder(),
                  oneNotebook()
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull(); // 1
                const id = remoteData[0].id!;

                // change local
                const newLocalValue = getNewValue(valueType, remoteData[2].id);
                setLocalItemField(id, field, newLocalValue);

                // change remote
                const newRemoteValue = getNewValue(valueType, remoteData[1].id);
                updateOnRemote(remoteData, id, field, newRemoteValue);
                await reInitRemoteData(remoteData);

                // pull again
                await syncService_pull(); // 2
                // no conflict file was created
                expect(getRowCountInsideNotebook()).toBe(3);
                expect(getLocalItemField(id, field)).toBe(newRemoteValue);
                expect(getLocalItemField(id, field)).not.toBe(newLocalValue);

                // check that a conflict file exists
                expect(getLocalItemConflict()).toBeUndefined();
                testPushIndicator(true);
              });
            });
          }

          if (type === 'page') {
            GET_CONFLICT_CHANGES(type).forEach(({ field, valueType }) => {
              it(`should create conflict for pages on pull if they have been changed with ${field} before being erased on remote`, async () => {
                const remoteData = getSomeRemoteData(type, testAddFn);
                await reInitRemoteData(remoteData);
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
                checkHistory(2, 1);

                // update locally
                const id = remoteData[0].id!;
                const oldParent = collectionService.getItemParent(id);
                const newValue = getNewValue(valueType, remoteData[2].id);
                setLocalItemField(id, field, newValue);
                historyService.saveNow();
                vi.advanceTimersByTime(50);
                const newParent = collectionService.getItemParent(id);
                let nbVersions = 1;

                if (collectionService.isHistorizableContentChange('p', field)) {
                  nbVersions++;
                }
                expect(historyService.getVersions(id)).toHaveLength(nbVersions);
                expect(historyService.getVersions(newParent)).toHaveLength(
                  nbVersions
                );
                if (newParent !== oldParent) {
                  expect(historyService.getVersions(oldParent)).toHaveLength(
                    nbVersions
                  );
                }

                // erase on remote
                const newRemoteData = remoteData.slice(1);
                await reInitRemoteData(newRemoteData, Date.now());
                await syncService_pull();

                // conflict has been created
                expect(getRowCountInsideNotebook()).toBe(newRemoteData.length);
                expect(getLocalItemConflicts()).toHaveLength(1);
                expect(collectionService.itemExists(id)).toBeFalsy();

                const conflictId = getLocalItemConflict()!;
                expect(getLocalItemField(conflictId, field)).toBe(newValue);
                testPushIndicator(true); // TODO: ideally, should be false

                nbVersions++;
                expect(historyService.getVersions(conflictId)).toHaveLength(0);
                expect(historyService.getVersions(id)).toHaveLength(nbVersions);
                if (newParent !== oldParent) {
                  expect(historyService.getVersions(oldParent)).toHaveLength(
                    nbVersions - 1
                  );
                }
                expect(historyService.getVersions(newParent)).toHaveLength(
                  nbVersions
                );

                // push, no conflict should be pushed
                await syncService_push();
                let remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(
                  newRemoteData.length
                );
                testPushIndicator(false);

                // now, solve conflict
                setLocalItemField(conflictId, 'tags', 'test');
                historyService.saveNow();
                console.debug(historyService.getVersions(conflictId));
                expect(historyService.getVersions(conflictId)).toHaveLength(1);
                testPushIndicator(true);
                expect(getLocalItemConflicts()).toHaveLength(0);

                await syncService_push();
                remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(remoteData.length);

                testPushIndicator(false);
                expect(historyService.getVersions(id)).toHaveLength(nbVersions);
                if (newParent !== oldParent) {
                  expect(historyService.getVersions(oldParent)).toHaveLength(
                    nbVersions - 1
                  );
                }
                expect(historyService.getVersions(newParent)).toHaveLength(
                  nbVersions + 1 // the conflict triggered a parent update
                );
              });
            });
          }
        });
      });

      describe(`tests with tags and notebooks`, () => {
        it.skip('should rebuild the tags cache on pull', async () => {
          expect(tagsService.getTags()).toHaveLength(0);

          const remoteData = [
            oneDocument(),
            oneDocument(),
            oneFolder(),
            oneNotebook()
          ];
          updateOnRemote(remoteData, remoteData[0].id!, 'tags', 'tag1,tag2');
          await reInitRemoteData(remoteData);
          await syncService_pull();

          expect(tagsService.getTags()).toHaveLength(2);
        });

        it('should pull items from multiple notebooks', async () => {
          const n1 = oneNotebook('n1', '0'); // 'merged' with local notebook
          const n2 = oneNotebook('n2', '1'); // new notebook
          const remoteData = [
            oneDocument(),
            oneDocument(),
            oneFolder(),
            n1,
            n2
          ];
          updateOnRemote(remoteData, remoteData[0].id!, 'notebook', n1.id!);
          updateOnRemote(remoteData, remoteData[1].id!, 'notebook', n2.id!);
          await reInitRemoteData(remoteData);
          await syncService_pull();
          expect(getRowCountInsideNotebook('0')).toBe(3);
          expect(getRowCountInsideNotebook('1')).toBe(0);
          expect(notebooksService.getNotebooks()).toHaveLength(2);
        });
      });
    });

    describe.skip('on force-pull operation', () => {
      it('should pull everything on first pull if remote has content', async () => {
        await reInitRemoteData([
          oneDocument(),
          oneDocument(),
          oneFolder(),
          oneNotebook()
        ]);
        await syncService.pull(undefined, true);
        expect(getRowCountInsideNotebook()).toBe(3);
      });

      it('should erase all created local items on force pull', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        // create local items
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(2);
        await syncService.pull(undefined, true);
        expect(getRowCountInsideNotebook()).toBe(3);
        expect(getRowIdsInsideNotebook()).toStrictEqual(
          remoteData
            .filter(r => r.type !== CollectionItemType.notebook)
            .map(r => r.id)
        );

        testPushIndicator(false);
      });

      it('should erase all existing local items on force pull', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        // create local items
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(2);
        localChangesService.clear();
        await syncService.pull(undefined, true);
        expect(getRowCountInsideNotebook()).toBe(3);
        expect(getRowIdsInsideNotebook()).toStrictEqual(
          remoteData
            .filter(r => r.type !== CollectionItemType.notebook)
            .map(r => r.id)
        );

        testPushIndicator(false);
      });

      it('should recreate all erased local items on force pull', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(3);

        // erase locally
        const id = remoteData[0].id!;
        collectionService_deleteItem(id);

        // pull again
        await syncService.pull(undefined, true);
        expect(getRowCountInsideNotebook()).toBe(3);

        testPushIndicator(false);
      });

      NON_NOTEBOOK_BROWSABLE_ITEM_TYPES.forEach(({ type, testAddFn }) => {
        GET_UPDATABLE_FIELDS(type).forEach(({ field, valueType }) => {
          it(`should erase local updates of field ${field} if they have not changed on remote ${type}`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);
            // update locally
            const id = remoteData[0].id!;
            const newValues = getNewValue(valueType);
            setLocalItemField(id, field, newValues);

            // pull again
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);
            expect(getLocalItemField(id, field)).not.toBe(newValues);

            testPushIndicator(false);
          });

          it(`should pull updates on second pull if remote ${type} has been updated with ${field}`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument(),
              oneFolder(),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);

            const id = remoteData[0].id!;
            // change remote
            const newValue = getNewValue(valueType, remoteData[2].id);
            updateOnRemote(remoteData, id, field, newValue);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);
            expect(collectionService.itemExists(id));
            expect(getLocalItemField(id, field)).toBe(newValue);
          });

          it(`should delete local ${type}s on pull even if they have been changed with ${field} after being erased on remote`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(3);

            // update locally
            const id = remoteData[0].id!;
            const newValue = getNewValue(valueType);
            setLocalItemField(id, field, newValue);

            // erase on remote
            await reInitRemoteData([
              remoteData[1],
              remoteData[2],
              remoteData[3]
            ]);
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(2);
            expect(collectionService.itemExists(id)).toBeFalsy();
            testPushIndicator(false);
          });
        });

        GET_ALL_CHANGES(type).forEach(
          ({ local, localValueType, remote, remoteValueType }) => {
            it(`should use server ${type} version when localChange=${local} then remoteChange=${remote}`, async () => {
              const remoteData = [
                testAddFn(),
                oneDocument(),
                oneFolder(),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change local
              const newLocalValue = getNewValue(
                localValueType,
                remoteData[1].id
              );
              setLocalItemField(id, local, newLocalValue);

              // change remote
              const newRemoteValue = getNewValue(
                remoteValueType,
                remoteData[2].id
              );
              updateOnRemote(remoteData, id, remote, newRemoteValue);
              await reInitRemoteData(remoteData);

              // pull again
              await syncService.pull(undefined, true);
              expect(getRowCountInsideNotebook()).toBe(3); // no conflict file was created
              expect(getLocalItemField(id, remote)).toBe(newRemoteValue);
              expect(getLocalItemField(id, local)).not.toBe(newLocalValue);

              testPushIndicator(false);
            });

            it(`should use server ${type} version when remoteChange=${remote} then localChange=${local}`, async () => {
              const remoteData = [
                testAddFn(),
                oneDocument(),
                oneFolder(),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change remote
              const newRemoteValue = getNewValue(
                remoteValueType,
                remoteData[2].id
              );
              updateOnRemote(remoteData, id, remote, newRemoteValue);
              await reInitRemoteData(remoteData);

              // change local
              const newLocalValue = getNewValue(
                localValueType,
                remoteData[1].id
              );
              setLocalItemField(id, local, newLocalValue);

              // pull again
              await syncService.pull(undefined, true);
              expect(getRowCountInsideNotebook()).toBe(3);
              expect(getLocalItemField(id, remote)).toBe(newRemoteValue);
              expect(getLocalItemField(id, local)).not.toBe(newLocalValue);

              testPushIndicator(false);
            });
          }
        );
      });
    });

    describe('on push operation', () => {
      it('should only push notebook on first push if collection is empty', async () => {
        expect(getRowCountInsideNotebook()).toBe(0);
        await syncService_push();
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(1);
        expect(remoteContent.content[0].type).toBe(CollectionItemType.notebook);
      });

      it('should push nothing even on first push if there are no local changes', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(3);
        localChangesService.clear();

        await syncService_pull();
        await syncService_push();
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(0); // use force push for that scenario
      });

      it('should push nothing on second push if there are no local changes', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        await syncService_push();

        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        localChangesService.clear();

        await syncService_push();
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(4); // 3 + 1 notebook
        expect(getDocsFolders(remoteContent.content)).toHaveLength(3);
      });

      it('should push everything on first push if remote has nothing', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(3);
        await syncService_push();
        const remoteContent = driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(4); // 3 + 1 notebook
        expect(getDocsFolders(remoteContent.content)).toHaveLength(3);

        testPushIndicator(false);
      });

      it(`should not delete items on remote if present on remote but not pulled locally`, async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook()
        ];
        await reInitRemoteData(remoteData);
        await syncService_pull();

        // add item remotely then push
        await reInitRemoteData([...remoteData, oneDocument(), oneFolder()]);
        await syncService_push();

        // item have been untouched
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(6);

        testPushIndicator(false);
      });

      NON_NOTEBOOK_ITEM_TYPES.forEach(({ type, testAddFn }) => {
        describe(`tests on a ${type}`, () => {
          it(`should delete remote ${type}s if they are erased locally and unchanged on remote`, async () => {
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = remoteData[0].id!;

            // delete item locally then push
            collectionService_deleteItem(id);
            await syncService_push();

            // item has been erased
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(remoteData.length - 1);

            testPushIndicator(false);
          });

          it(`should not recreate ${type}s deleted on remote and unchanged locally`, async () => {
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();

            // delete item remotely then push
            await reInitRemoteData(remoteData.slice(1));
            await syncService_push();

            // item has not been recreated
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(remoteData.length - 1);

            testPushIndicator(false);
          });

          GET_UPDATABLE_FIELDS(type).forEach(({ field, valueType }) => {
            it(`should update remote ${type}s if they are updated locally with ${field} and unchanged on remote`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // update item locally then push
              const newValue = getNewValue(valueType, remoteData[2].id);
              setLocalItemField(id, field, newValue);
              await syncService_push();

              // item has been updated
              const remoteContent = await driver.getParsedContent();
              expect(remoteContent.content).toHaveLength(remoteData.length);
              expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
                newValue
              );
              testPushIndicator(false);
            });

            it(`should delete remote ${type}s if they are updated with ${field} on remote then erased locally`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change remote
              const newValue = getNewValue(valueType, remoteData[3].id);
              updateOnRemote(remoteData, id, field, newValue);
              await reInitRemoteData(remoteData);

              // delete item locally then push
              collectionService_deleteItem(id);
              await syncService_push();

              // item has been erased
              const remoteContent = await driver.getParsedContent();
              expect(remoteContent.content).toHaveLength(remoteData.length - 1);

              testPushIndicator(false);
            });

            it(`should delete remote ${type}s if they are erased locally then updated with ${field} on remote`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // delete item locally
              collectionService_deleteItem(id);
              // change remote
              const newValue = getNewValue(valueType, remoteData[3].id);
              updateOnRemote(remoteData, id, field, newValue);
              await reInitRemoteData(remoteData);

              await syncService_push();

              // item has been erased
              const remoteContent = await driver.getParsedContent();
              expect(remoteContent.content).toHaveLength(remoteData.length - 1);

              testPushIndicator(false);
            });

            it(`should recreate ${type}s deleted on remote and changed locally with ${field}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // delete item remotely
              await reInitRemoteData(remoteData.slice(1));
              // update locally
              expect(id).toBeDefined();
              const newValue = getNewValue(valueType, remoteData[2].id);
              setLocalItemField(id!, field, newValue);
              // push
              await syncService_push();

              // item has been recreated
              const remoteContent = await driver.getParsedContent();
              expect(remoteContent.content).toHaveLength(remoteData.length);
              expect(
                getRemoteItemField(remoteContent.content, id!, field)
              ).toBe(newValue);

              testPushIndicator(false);
            });

            it(`should not update ${type}s unchanged on local even if updated remotely with ${field} (server wins)`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();

              // change remote
              const id = remoteData[0].id!;
              const newValue = getNewValue(valueType, remoteData[3].id);
              updateOnRemote(remoteData, id, field, newValue);
              await reInitRemoteData(remoteData);

              // push
              await syncService_push();

              // item has not been changed on remote
              const remoteContent = await driver.getParsedContent();
              expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
                newValue
              );
              testPushIndicator(false);
            });
          });

          GET_ALL_CHANGES(type).forEach(
            ({ local, localValueType, remote, remoteValueType }) => {
              it(`should update ${type} when localChange=${local} then remoteChange=${remote}: local wins`, async () => {
                const remoteData = getSomeRemoteData(type, testAddFn);
                await reInitRemoteData(remoteData);
                await syncService_pull();
                const id = remoteData[0].id!;
                // change local
                const newLocalValue = getNewValue(
                  localValueType,
                  remoteData[2].id
                );
                setLocalItemField(id, local, newLocalValue);
                // change remote
                const newRemoteValue = getNewValue(
                  remoteValueType,
                  remoteData[3].id
                );
                updateOnRemote(remoteData, id, remote, newRemoteValue);
                await reInitRemoteData(remoteData);
                // push
                await syncService_push();

                const remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(remoteData.length);
                if (remote !== local) {
                  expect(
                    getRemoteItemField(remoteContent.content, id, remote)
                  ).not.toBe(newLocalValue);
                }
                expect(
                  getRemoteItemField(remoteContent.content, id, local)
                ).toBe(newLocalValue);

                testPushIndicator(false);
              });

              it(`should update ${type} when remoteChange=${remote} then localChange=${local}: local wins`, async () => {
                const remoteData = getSomeRemoteData(type, testAddFn);
                await reInitRemoteData(remoteData);
                await syncService_pull();
                const id = remoteData[0].id!;
                // change remote
                const newRemoteValue = getNewValue(
                  remoteValueType,
                  remoteData[3].id
                );
                updateOnRemote(remoteData, id, remote, newRemoteValue);
                await reInitRemoteData(remoteData);
                // change local
                const newLocalValue = getNewValue(
                  localValueType,
                  remoteData[2].id
                );
                setLocalItemField(id, local, newLocalValue);

                // push
                await syncService_push();
                const remoteContent = await driver.getParsedContent();
                expect(remoteContent.content).toHaveLength(remoteData.length);
                expect(
                  getRemoteItemField(remoteContent.content, id, remote)
                ).not.toBe(newRemoteValue);
                expect(
                  getRemoteItemField(remoteContent.content, id, local)
                ).toBe(newLocalValue);
                testPushIndicator(false);
              });
            }
          );

          if (type === 'document') {
            CONFLICT_CHANGES.forEach(
              ({ local, localValueType, remote, remoteValueType }) => {
                it(`should not push conflicts on a document between ${local} and ${remote}: local wins`, async () => {
                  // create a conflict
                  const remoteData = [
                    oneDocument(),
                    oneDocument(),
                    oneFolder(),
                    oneNotebook()
                  ];
                  await reInitRemoteData(remoteData);
                  await syncService_pull();
                  const id = remoteData[0].id!;
                  const newLocalValue = getNewValue(
                    localValueType,
                    remoteData[1].id
                  );
                  setLocalItemField(id, local, newLocalValue);
                  const newRemoteValue = getNewValue(
                    remoteValueType,
                    remoteData[2].id
                  );
                  updateOnRemote(remoteData, id, remote, newRemoteValue);
                  await reInitRemoteData(remoteData);
                  await syncService_pull();

                  expect(getLocalItemConflicts()).toHaveLength(1);
                  expect(getRowCountInsideNotebook()).toBe(4); // a conflict file was created

                  // conflict should not be pushed, remote value is kept
                  await syncService_push();
                  const remoteContent = await driver.getParsedContent();
                  expect(remoteContent.content).toHaveLength(4);
                  expect(
                    getRemoteItemField(remoteContent.content, id, remote)
                  ).toBe(newRemoteValue);
                  expect(
                    getRemoteItemField(remoteContent.content, id, local)
                  ).not.toBe(newLocalValue);
                  testPushIndicator(false);
                });
              }
            );
          }
        });
      });

      it('should push items from multiple notebooks', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        const notebookId = notebooksService.addNotebook('n0')!;
        collectionService_addDocument(notebookId);
        collectionService_addFolder(notebookId);
        expect(getRowCountInsideNotebook(ROOT_COLLECTION)).toBe(5);

        await syncService_push();
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(5);
      });
    });

    describe('on force-push operation', () => {
      it('should push nothing the first push if collection is empty', async () => {
        expect(getRowCountInsideNotebook()).toBe(0);
        await syncService.push(undefined, true);
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(1);
        expect(getDocsFolders(remoteContent.content)).toHaveLength(0);
      });

      it('should push everything on first push even if there are no local changes', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(3);
        localChangesService.clear();

        await syncService_pull();
        await syncService.push(undefined, true);
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(4);
        expect(getDocsFolders(remoteContent.content)).toHaveLength(3);
      });

      it('should push everything on second push even if there are no local changes', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        await syncService_push();

        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        localChangesService.clear();

        await syncService.push(undefined, true);
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(5);
        expect(getDocsFolders(remoteContent.content)).toHaveLength(4);
      });

      it('should push everything on first push if remote has nothing', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(3);
        await syncService.push(undefined, true);
        const remoteContent = driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(4); // 3 + 1 notebook
        expect(getDocsFolders(remoteContent.content)).toHaveLength(3);

        testPushIndicator(false);
      });

      it(`should delete items on remote if present on remote but not pulled locally`, async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3'),
          oneNotebook('n0')
        ];
        await reInitRemoteData(remoteData);
        await syncService_pull();

        // add item remotely then push
        await reInitRemoteData([...remoteData, oneDocument(), oneFolder()]);
        await syncService.push(undefined, true);

        // item have been deleted
        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.content).toHaveLength(4);
        expect(remoteContent.content.map(r => r.title)).toEqual([
          getGlobalTrans().defaultNotebookName,
          'r1',
          'r2',
          'r3'
        ]);

        testPushIndicator(false);
      });

      NON_NOTEBOOK_BROWSABLE_ITEM_TYPES.forEach(({ type, testAddFn }) => {
        it(`should delete remote ${type}s if they are erased locally and unchanged on remote`, async () => {
          const remoteData = [
            testAddFn('r1'),
            oneDocument('r2'),
            oneFolder('r3'),
            oneNotebook()
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();
          const id = remoteData[0].id!;

          // delete item locally then push
          collectionService_deleteItem(id);
          await syncService.push(undefined, true);

          // item has been erased
          const remoteContent = await driver.getParsedContent();
          expect(remoteContent.content).toHaveLength(3);

          testPushIndicator(false);
        });

        it(`should recreate ${type}s deleted on remote and unchanged locally`, async () => {
          const remoteData = [
            testAddFn('r1'),
            oneDocument('r2'),
            oneFolder('r3'),
            oneNotebook()
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();

          // delete item remotely then push
          await reInitRemoteData([remoteData[1], remoteData[2], remoteData[3]]);
          await syncService.push(undefined, true);

          // item has been recreated
          const remoteContent = await driver.getParsedContent();
          expect(remoteContent.content).toHaveLength(4);

          testPushIndicator(false);
        });

        GET_UPDATABLE_FIELDS(type).forEach(({ field, valueType }) => {
          it(`should update remote ${type}s if they are updated locally with ${field} and unchanged on remote`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = remoteData[0].id!;

            // update item locally then push
            const newValue = getNewValue(valueType);
            setLocalItemField(id, field, newValue);
            await syncService.push(undefined, true);

            // item has been updated
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(4);
            expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
              newValue
            );
            testPushIndicator(false);
          });

          it(`should delete remote ${type}s if they are updated with ${field} on remote then erased locally`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = remoteData[0].id!;

            // change remote
            const newValue = getNewValue(valueType);
            updateOnRemote(remoteData, id, field, newValue);
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService_deleteItem(id);
            await syncService.push(undefined, true);

            // item has been erased
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(3);

            testPushIndicator(false);
          });

          it(`should delete remote ${type}s if they are erased locally then updated with ${field} on remote`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = remoteData[0].id!;

            // delete item locally
            collectionService_deleteItem(id);
            // change remote
            const newValue = getNewValue(valueType);
            updateOnRemote(remoteData, id, field, newValue);
            await reInitRemoteData(remoteData);

            await syncService.push(undefined, true);

            // item has been erased
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(3);

            testPushIndicator(false);
          });

          it(`should recreate ${type}s deleted on remote and changed locally with ${field}`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = remoteData[0].id!;

            // delete item remotely
            await reInitRemoteData([
              remoteData[1],
              remoteData[2],
              remoteData[3]
            ]);
            // update locally
            expect(id).toBeDefined();
            const newValue = getNewValue(valueType);
            setLocalItemField(id!, field, newValue);
            // push
            await syncService.push(undefined, true);

            // item has been recreated
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(4);
            expect(getRemoteItemField(remoteContent.content, id!, field)).toBe(
              newValue
            );

            testPushIndicator(false);
          });

          it(`should update ${type}s unchanged on local even if updated remotely with ${field} (local wins)`, async () => {
            const remoteData = [
              testAddFn('r1'),
              oneDocument('r2'),
              oneFolder('r3'),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();

            // change remote
            const id = remoteData[0].id!;
            const newValue = getNewValue(valueType);
            updateOnRemote(remoteData, id, field, newValue);
            await reInitRemoteData(remoteData);

            // push
            await syncService.push(undefined, true);

            // item has been changed on remote
            const remoteContent = await driver.getParsedContent();
            expect(
              getRemoteItemField(remoteContent.content, id, field)
            ).not.toBe(newValue);
            testPushIndicator(false);
          });
        });

        GET_ALL_CHANGES(type).forEach(
          ({ local, localValueType, remote, remoteValueType }) => {
            it(`should update ${type} when localChange=${local} then remoteChange=${remote}: local wins`, async () => {
              const remoteData = [
                testAddFn(),
                oneDocument(),
                oneFolder(),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;
              // change local
              const newLocalValue = getNewValue(localValueType);
              setLocalItemField(id, local, newLocalValue);
              // change remote
              const newRemoteValue = getNewValue(remoteValueType);
              updateOnRemote(remoteData, id, remote, newRemoteValue);
              await reInitRemoteData(remoteData);
              // push
              await syncService.push(undefined, true);

              const remoteContent = await driver.getParsedContent();
              expect(remoteContent.content).toHaveLength(4);
              if (remote !== local) {
                expect(
                  getRemoteItemField(remoteContent.content, id, remote)
                ).not.toBe(newLocalValue);
              }
              expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
                newLocalValue
              );

              testPushIndicator(false);
            });

            it(`should update ${type} when remoteChange=${remote} then localChange=${local}: local wins`, async () => {
              const remoteData = [
                testAddFn(),
                oneDocument(),
                oneFolder(),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;
              // change remote
              const newRemoteValue = getNewValue(
                remoteValueType,
                remoteData[2].id!
              );
              updateOnRemote(remoteData, id, remote, newRemoteValue);
              await reInitRemoteData(remoteData);
              // change local
              const newLocalValue = getNewValue(
                localValueType,
                remoteData[3].id!
              );
              setLocalItemField(id, local, newLocalValue);

              // push
              await syncService.push(undefined, true);
              const remoteContent = await driver.getParsedContent();
              expect(remoteContent.content).toHaveLength(4);
              expect(
                getRemoteItemField(remoteContent.content, id, remote)
              ).not.toBe(newRemoteValue);
              expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
                newLocalValue
              );
              testPushIndicator(false);
            });
          }
        );
      });

      CONFLICT_CHANGES.forEach(
        ({ local, localValueType, remote, remoteValueType }) => {
          it(`should not push conflicts between ${local} and ${remote}: local wins`, async () => {
            // create a conflict
            const remoteData = [
              oneDocument(),
              oneDocument(),
              oneFolder(),
              oneNotebook()
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = remoteData[0].id!;
            const newLocalValue = getNewValue(localValueType, remoteData[1].id);
            setLocalItemField(id, local, newLocalValue);
            const newRemoteValue = getNewValue(
              remoteValueType,
              remoteData[2].id
            );
            setLocalItemField(id, local, newLocalValue);
            updateOnRemote(remoteData, id, remote, newRemoteValue);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(4); // a conflict file was created

            // conflict should not be pushed, remote value is kept
            await syncService.push(undefined, true);
            const remoteContent = await driver.getParsedContent();
            expect(remoteContent.content).toHaveLength(4);
            expect(getRemoteItemField(remoteContent.content, id, remote)).toBe(
              newRemoteValue
            );
            expect(
              getRemoteItemField(remoteContent.content, id, local)
            ).not.toBe(newLocalValue);
            testPushIndicator(false);
          });
        }
      );
    });

    describe(`tests with values`, () => {
      it(`should pull updated values`, async () => {
        await reInitRemoteData([oneNotebook()], Date.now(), {
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: Date.now()
        });

        expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
          sort: {
            by: 'created',
            descending: false
          }
        });

        await syncService_pull();

        expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
          sort: {
            by: 'order',
            descending: true
          }
        });
      });

      it(`should not pull remote values if local changed`, async () => {
        await reInitRemoteData([oneNotebook()], Date.now(), {
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: Date.now()
        });

        vi.advanceTimersByTime(fakeTimersDelay);
        userSettingsService.setSpaceDefaultDisplayOpts({
          sort: {
            by: 'updated',
            descending: false
          }
        });

        await syncService_pull();

        expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
          sort: {
            by: 'updated',
            descending: false
          }
        });
      });

      it(`should force pull remote values even if local changed`, async () => {
        await reInitRemoteData([oneNotebook()], Date.now(), {
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: Date.now()
        });

        vi.advanceTimersByTime(fakeTimersDelay);
        userSettingsService.setSpaceDefaultDisplayOpts({
          sort: {
            by: 'updated',
            descending: false
          }
        });

        await syncService_pull(true);

        expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
          sort: {
            by: 'order',
            descending: true
          }
        });
      });

      it(`should push updated values`, async () => {
        await reInitRemoteData([oneNotebook()], Date.now(), {
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: Date.now()
        });

        vi.advanceTimersByTime(fakeTimersDelay);
        userSettingsService.setSpaceDefaultDisplayOpts({
          sort: {
            by: 'updated',
            descending: false
          }
        });
        await syncService_push();

        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.values).toEqual({
          ...defaultValues,
          defaultSortBy: 'updated',
          defaultSortDesc: false,
          lastUpdated: storageService.getSpace().getValue('lastUpdated')
        });
      });

      it(`should not push remote values if remote changed`, async () => {
        userSettingsService.setSpaceDefaultDisplayOpts({
          sort: {
            by: 'updated',
            descending: false
          }
        });
        vi.advanceTimersByTime(fakeTimersDelay);

        const pushTime = Date.now();
        await reInitRemoteData([oneNotebook()], pushTime, {
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: pushTime
        });

        await syncService_push();

        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.values).toEqual({
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: pushTime
        });
      });

      it(`should force push remote values even if remote changed`, async () => {
        const localTime = Date.now();
        userSettingsService.setSpaceDefaultDisplayOpts({
          sort: {
            by: 'updated',
            descending: false
          }
        });
        vi.advanceTimersByTime(fakeTimersDelay);

        await reInitRemoteData([oneNotebook()], Date.now(), {
          ...defaultValues,
          defaultSortBy: 'order',
          defaultSortDesc: true,
          lastUpdated: Date.now()
        });

        await syncService_push(true);

        const remoteContent = await driver.getParsedContent();
        expect(remoteContent.values).toEqual({
          ...defaultValues,
          defaultSortBy: 'updated',
          defaultSortDesc: false,
          lastUpdated: localTime
        });
      });
    });
  });
  // });
});
