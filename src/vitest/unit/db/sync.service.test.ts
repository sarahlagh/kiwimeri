import {
  CollectionItem,
  CollectionItemType,
  parseFieldMeta
} from '@/collection/collection';
import { getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID, ROOT_COLLECTION } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import notebooksService from '@/db/notebooks.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import tagsService from '@/db/tags.service';
import { LocalChangeType } from '@/db/types/store-types';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { LayerTypes } from '@/remote-storage/storage-provider.factory';
import { syncService } from '@/remote-storage/sync.service';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONFLICT_CHANGES,
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

const reInitRemoteData = async (items: CollectionItem[], updateTs?: number) => {
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
  console.debug('[reInitRemoteData]', items, lastLocalChange);
  await driver.setContent(items, lastLocalChange);
  vi.advanceTimersByTime(fakeTimersDelay);
};

const syncService_pull = async () => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pulling', ++iPull, Date.now());
  await syncService.pull();
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('done pulling', Date.now());
};

const syncService_push = async () => {
  vi.advanceTimersByTime(fakeTimersDelay);
  console.debug('start pushing', ++iPush, Date.now());
  await syncService.push();
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
  collectionService.addDocument(parent);
  vi.advanceTimersByTime(fakeTimersDelay);
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

describe('sync service', () => {
  // [{ layer: 'simple' } /*, { layer: 'bucket' } */].forEach(({ layer }) => {
  const layer = 'simple';
  describe(`with ${layer} layer`, () => {
    beforeEach(async () => {
      remotesService['layer'] = layer as LayerTypes;
      remotesService.addRemote('test', 0, 'inmem', {});
      await remotesService.initSyncConnection(
        storageService.getSpaceId(),
        true,
        true
      );
      driver = remotesService['providers'].values().next().value![
        'driver'
      ] as InMemDriver;
      vi.useFakeTimers();
    });
    afterEach(() => {
      iPull = 0;
      iPush = 0;
      vi.useRealTimers();
    });

    it('should detect if primary remote is connected', () => {
      const { result } = renderHook(() => syncService.usePrimaryConnected());
      expect(result.current).toBeTruthy();
    });

    it('should tell if there is no local change', () => {
      act(() => {
        localChangesService.clear();
      });
      const { result } = renderHook(() =>
        syncService.usePrimaryHasLocalChanges()
      );
      expect(result.current).toBeFalsy();
    });

    it('should tell if there is are local changes', () => {
      // by default a new notebook is created
      expect(localChangesService.getLocalChanges()).toHaveLength(1);
      const { result } = renderHook(() =>
        syncService.usePrimaryHasLocalChanges()
      );
      expect(result.current).toBeTruthy();
    });

    it('should pull new remote items, create newer, then push', async () => {
      const remoteData = [
        oneNotebook('n0'),
        oneDocument('r1'),
        oneDocument('r2'),
        oneFolder('r3')
      ];
      await reInitRemoteData(remoteData);
      await syncService_pull();
      expect(getRowCountInsideNotebook()).toBe(3);
      collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
      await syncService_push();
      const remoteContent = await driver.getContent();
      expect(remoteContent.content).toHaveLength(5);
      expect(remoteContent.content.map(r => r.type)).toEqual([
        CollectionItemType.notebook,
        CollectionItemType.document,
        CollectionItemType.document,
        CollectionItemType.folder,
        CollectionItemType.folder
      ]);
      expect(remoteContent.content.map(r => r.title)).toEqual([
        getGlobalTrans().defaultNotebookName,
        'r1',
        'r2',
        'r3',
        'New folder'
      ]);
      expect(getRowCountInsideNotebook()).toBe(4);
    });

    it('should handle missing file info if remote has been initialized elsewhere', async () => {
      const remoteData = [
        oneNotebook('n0'),
        oneDocument('r1'),
        oneDocument('r2'),
        oneFolder('r3')
      ];
      await reInitRemoteData(remoteData);
      await syncService_pull();
      expect(getRowCountInsideNotebook()).toBe(3);
    });

    it('should create version file on first init', async () => {
      const { content } = await driver.pullFile('', 'S1');
      expect(content).toBe('0');
    });

    it('should handle reinit on network down', async () => {
      // create local item, don't sync
      collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
      // create item on remote, sync
      await reInitRemoteData([oneDocument('remote')]);
      // reinit sync after network down
      await remotesService.initSyncConnection(
        storageService.getSpaceId(),
        false
      );
      // now pull
      await syncService_pull();
      // both items are kept
      expect(getRowCountInsideNotebook()).toBe(2);
    });

    describe('on pull operation', () => {
      it('should do nothing on first pull if remote has nothing', async () => {
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(0);
      });

      it('should pull everything on first pull if remote has content', async () => {
        await reInitRemoteData([
          oneDocument(),
          oneDocument(),
          oneFolder(),
          oneNotebook()
        ]);
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(3);
      });

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

        // indicator should still tell if push allowed
        testPushIndicator(true);
      });

      it('should pull new remote items without erasing existing items', async () => {
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
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(3);

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

        // update remote again
        await reInitRemoteData([...remoteData, oneDocument('r4')]);
        await syncService_pull();
        expect(getRowCountInsideNotebook()).toBe(5);
        expect(getLocalItemConflicts()).toHaveLength(0);

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

        testPushIndicator(false);
      });

      NON_NOTEBOOK_ITEM_TYPES.forEach(({ type, testAddFn }) => {
        describe(`tests on a ${type}`, () => {
          it(`should delete local ${type}s on pull if they have not been changed and erased on remote`, async () => {
            localChangesService.clear();
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            console.log(
              'table',
              storageService.getSpace().getTable('collection')
            );
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

            // erase on remote

            await reInitRemoteData(remoteData.slice(1));
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);
            testPushIndicator(false);
          });

          it(`should not recreate ${type}s erased locally on pull if they have not changed on remote`, async () => {
            const remoteData = getSomeRemoteData(type, testAddFn);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
            // erase locally
            const id = remoteData[0].id!;
            collectionService_deleteItem(id);

            // pull again
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);

            testPushIndicator(true);
          });

          GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
            it(`should pull updates on second pull if remote ${type} has been updated with ${field}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;
              // change remote
              updateOnRemote(remoteData, id, field, remoteData[3].id!);
              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(collectionService.itemExists(id!)).toBeTruthy();
              expect(getLocalItemField(id!, field)).toBe(remoteData[3].id!);
            });

            it(`should not delete local updates of field ${field} if they have not changed on remote ${type}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              // update locally
              const id = remoteData[0].id!;
              setLocalItemField(id, field, remoteData[2].id!);

              // pull again
              await syncService_pull();
              expect(getLocalItemField(id, field)).toBe(remoteData[2].id!);
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              testPushIndicator(true);
            });

            it(`should not delete local ${type}s on pull if they have been changed with ${field} after being erased on remote`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;

              // erase on remote
              await reInitRemoteData(remoteData.slice(1), Date.now());

              // update locally
              setLocalItemField(id, field, remoteData[3].id!);

              await syncService_pull();

              // item is unchanged
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemConflicts()).toHaveLength(0);
              expect(getLocalItemField(id, field)).toBe(remoteData[3].id!);
              testPushIndicator(true);
            });

            it(`should not recreate ${type}s erased locally on pull if they have changed on remote with ${field} before delete`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;
              // update on remote
              updateOnRemote(remoteData, id, field);
              await reInitRemoteData(remoteData);

              // erase locally
              collectionService_deleteItem(id);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);
              expect(collectionService.itemExists(id)).toBeFalsy();

              testPushIndicator(true);
            });
          });

          GET_NON_PARENT_UPDATABLE_FIELDS(type).forEach(({ field }) => {
            it(`should recreate ${type}s erased locally on pull if they have changed on remote with ${field} after delete`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

              const id = remoteData[0].id!;
              // erase locally
              collectionService_deleteItem(id);

              // update on remote
              updateOnRemote(remoteData, id, field);
              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemConflicts()).toHaveLength(0);
              expect(getLocalItemField(id, field)).toBe('newRemote');

              testPushIndicator(true);
            });
          });

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
            updateOnRemote(remoteData, id, 'parent');
            await reInitRemoteData(remoteData);

            // pull again
            await syncService_pull();
            expect(getRowCountInsideNotebook()).toBe(remoteData.length - 2);
            expect(collectionService.itemExists(id)).toBe(false);

            testPushIndicator(true);
          });

          // fields that can change: parent, title, content, deleted
          GET_NON_CONFLICT_CHANGES(type).forEach(({ local, remote }) => {
            it(`should merge changes on ${type} without conflict if localChange=${local} then remoteChange=${remote}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              const id = remoteData[0].id!;

              // change local
              setLocalItemField(id, local, remoteData[3].id!);

              // change remote
              updateOnRemote(remoteData, id, remote, remoteData[2].id!);
              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull(); // 2
              // no conflict created
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemConflicts()).toHaveLength(0);
              expect(getLocalItemField(id, remote)).toBe(remoteData[2].id!);
              expect(getLocalItemField(id, local)).toBe(remoteData[3].id!);
            });

            it(`should merge changes on ${type} without conflict if remoteChange=${remote} then localChange=${local}`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change remote
              updateOnRemote(remoteData, id, remote, remoteData[3].id!);
              await reInitRemoteData(remoteData);

              // change local
              setLocalItemField(id, local, remoteData[2].id!);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemField(id, remote)).toBe(remoteData[3].id!);
              expect(getLocalItemField(id, local)).toBe(remoteData[2].id!);

              testPushIndicator(true);
            });
          });

          GET_CONFLICT_CHANGES(type).forEach(({ field }) => {
            it(`should apply local change on ${type} when remoteChange=${field} then localChange=${field} (local wins)`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change remote
              updateOnRemote(remoteData, id, field);
              await reInitRemoteData(remoteData);

              // change local
              setLocalItemField(id, field, remoteData[2].id!);

              // pull again
              await syncService_pull();
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              expect(getLocalItemField(id, field)).toBe(remoteData[2].id!);

              testPushIndicator(true);
            });
          });

          if (type === 'document' || type === 'page') {
            it(`should update preview on ${type} when remote content has changed`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);
              const id = remoteData[0].id!;
              expect(getLocalItemField(id, 'preview')).toBeUndefined();

              // change remote
              updateOnRemote(remoteData, id, 'content');
              await reInitRemoteData(remoteData);

              await syncService_pull(); // 2
              expect(getLocalItemField(id, 'content')).toBe('newRemote');
              expect(getLocalItemField(id, 'preview')).toBe('newRemote');
            });
          }

          if (type === 'document') {
            GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
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
                setLocalItemField(id, field, remoteData[2].id!);
                vi.advanceTimersByTime(50);

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
                expect(getLocalItemField(conflictId, field)).toBe(
                  remoteData[2].id!
                );
                testPushIndicator(true); // TODO: ideally, should be false

                // push, no conflict should be pushed
                await syncService_push();
                let remoteContent = await driver.getContent();
                expect(remoteContent.content).toHaveLength(3);
                testPushIndicator(false);

                // now, solve conflict
                setLocalItemField(conflictId, 'content', 'new content');
                testPushIndicator(true);
                expect(getLocalItemConflicts()).toHaveLength(0);

                await syncService_push();
                remoteContent = await driver.getContent();
                expect(remoteContent.content).toHaveLength(4);

                testPushIndicator(false);
              });
            });

            GET_CONFLICT_CHANGES(type).forEach(({ field }) => {
              it(`should create conflict for documents if localChange=${field} then remoteChange=${field}`, async () => {
                const folder = oneFolder();
                const remoteData = [
                  oneDocument(),
                  oneDocument(),
                  folder,
                  oneNotebook()
                ];
                await reInitRemoteData(remoteData);
                await syncService_pull(); // 1
                const id = remoteData[0].id!;

                // change local
                setLocalItemField(id, field, folder.id!); // real id to avoid problem when field=parent

                // change remote
                updateOnRemote(remoteData, id, field, remoteData[1].id!);
                await reInitRemoteData(remoteData);

                // pull again
                await syncService_pull(); // 2
                // a conflict file was created
                expect(getRowCountInsideNotebook()).toBe(4);
                expect(getLocalItemField(id, field)).toBe(remoteData[1].id!);
                expect(getLocalItemField(id, field)).not.toBe(folder.id!);

                // check that a conflict file exists
                const conflictId = getLocalItemConflict();
                expect(conflictId).toBeDefined();
                testPushIndicator(true);

                // pull again
                await syncService_pull(); // 3
                // conflict was untouched
                expect(getRowCountInsideNotebook()).toBe(4);
                expectHasLocalItemConflict(conflictId!, true);

                // update the conflict => will remove its 'conflict' flag
                setLocalItemField(
                  conflictId!,
                  'title',
                  'conflict file updated only'
                );
                expect(getRowCountInsideNotebook()).toBe(4);
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

                // pull again
                await syncService_pull(); // 4
                // conflict was not solved by a new timestamp, so, nothing new
                expect(getLocalItemConflict()).toBeUndefined();
                expect(getRowCountInsideNotebook()).toBe(4);

                // solve the conflict at last
                expect(collectionService.itemExists(id)).toBeTruthy();
                setLocalItemField(id, 'tags', 'conflict updated');

                // pull again
                await syncService_pull(); // 5
                expect(getRowCountInsideNotebook()).toBe(4);
                expect(collectionService.itemExists(conflictId!)).toBeTruthy();
              });
            });

            it('should handle multiple merge on one document without conflict', async () => {
              const remoteData = [
                oneDocument(),
                oneDocument(),
                oneFolder(),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              const id = remoteData[0].id!;

              // change remote
              updateOnRemote(remoteData, id, 'content');
              updateOnRemote(remoteData, id, 'title');

              // change local
              setLocalItemField(id, 'title', 'newLocal');
              setLocalItemField(id, 'tags', 'newLocal');

              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull(); // 2
              // no conflict created
              expect(getRowCountInsideNotebook()).toBe(3);
              expect(getLocalItemConflicts()).toHaveLength(0);
              expect(getLocalItemField(id, 'title')).toBe('newLocal');
              expect(getLocalItemField(id, 'tags')).toBe('newLocal');
              expect(getLocalItemField(id, 'content')).toBe('newRemote');
            });

            it('should handle multiple merge on one document with conflict', async () => {
              const remoteData = [
                oneDocument(),
                oneDocument(),
                oneFolder(),
                oneNotebook()
              ];
              await reInitRemoteData(remoteData);
              await syncService_pull(); // 1
              const id = remoteData[0].id!;

              // change local
              setLocalItemField(id, 'title', 'newLocal');
              setLocalItemField(id, 'tags', 'newLocal');

              // change remote
              updateOnRemote(remoteData, id, 'content');
              updateOnRemote(remoteData, id, 'title');

              await reInitRemoteData(remoteData);

              // pull again
              await syncService_pull(); // 2
              // a conflict is created due to title field
              expect(getRowCountInsideNotebook()).toBe(4);
              expect(getLocalItemConflicts()).toHaveLength(1);
              expect(getLocalItemField(id, 'title')).toBe('newRemote');
              expect(getLocalItemField(id, 'tags')).toBe('newLocal');
              expect(getLocalItemField(id, 'content')).toBe('newRemote');
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
                setLocalItemField(id, field, 'newLocal');
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
                const remoteContent = await driver.getContent();
                expect(remoteContent.content).toHaveLength(2);
                testPushIndicator(false);
              });
            });

            GET_CONFLICT_CHANGES(type).forEach(({ field }) => {
              if (type === 'folder') {
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
                  setLocalItemField(id, field, remoteData[2].id!);

                  // change remote
                  updateOnRemote(remoteData, id, field, remoteData[1].id!);
                  await reInitRemoteData(remoteData);

                  // pull again
                  await syncService_pull(); // 2
                  // no conflict file was created
                  expect(getRowCountInsideNotebook()).toBe(3);
                  expect(getLocalItemField(id, field)).toBe(remoteData[1].id!);
                  expect(getLocalItemField(id, field)).not.toBe(
                    remoteData[2].id!
                  );

                  // check that a conflict file exists
                  expect(getLocalItemConflict()).toBeUndefined();
                  testPushIndicator(true);
                });
              }
            });
          }

          if (type === 'page') {
            GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
              it(`should create conflict for pages on pull if they have been changed with ${field} before being erased on remote`, async () => {
                const remoteData = getSomeRemoteData(type, testAddFn);
                await reInitRemoteData(remoteData);
                await syncService_pull();
                expect(getRowCountInsideNotebook()).toBe(remoteData.length - 1);

                // update locally
                const id = remoteData[0].id!;
                setLocalItemField(id, field, remoteData[2].id!);
                vi.advanceTimersByTime(50);

                // erase on remote
                const newRemoteData = remoteData.slice(1);
                await reInitRemoteData(newRemoteData, Date.now());
                await syncService_pull();

                // conflict has been created
                expect(getRowCountInsideNotebook()).toBe(newRemoteData.length);
                expect(getLocalItemConflicts()).toHaveLength(1);
                expect(collectionService.itemExists(id)).toBeFalsy();

                const conflictId = getLocalItemConflict()!;
                expect(getLocalItemField(conflictId, field)).toBe(
                  remoteData[2].id!
                );
                testPushIndicator(true); // TODO: ideally, should be false

                // push, no conflict should be pushed
                await syncService_push();
                let remoteContent = await driver.getContent();
                expect(remoteContent.content).toHaveLength(
                  newRemoteData.length
                );
                testPushIndicator(false);

                // now, solve conflict
                setLocalItemField(conflictId, 'content', 'new content');
                testPushIndicator(true);
                expect(getLocalItemConflicts()).toHaveLength(0);

                await syncService_push();
                remoteContent = await driver.getContent();
                expect(remoteContent.content).toHaveLength(remoteData.length);

                testPushIndicator(false);
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

    describe('on force-pull operation', () => {
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
        GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
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
            setLocalItemField(id, field, 'newLocal');

            // pull again
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);
            expect(getLocalItemField(id, field)).not.toBe('newLocal');

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
            updateOnRemote(remoteData, id, field, remoteData[2].id!);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);
            expect(collectionService.itemExists(id));
            expect(getLocalItemField(id, field)).toBe(remoteData[2].id!);
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
            setLocalItemField(id, field, 'newLocal');

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

        GET_ALL_CHANGES(type).forEach(({ local, remote }) => {
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
            setLocalItemField(id, local, remoteData[1].id!);

            // change remote
            updateOnRemote(remoteData, id, remote, remoteData[2].id!);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3); // no conflict file was created
            expect(getLocalItemField(id, remote)).toBe(remoteData[2].id!);
            expect(getLocalItemField(id, local)).not.toBe(remoteData[1].id!);

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
            updateOnRemote(remoteData, id, remote, remoteData[2].id!);
            await reInitRemoteData(remoteData);

            // change local
            setLocalItemField(id, local, remoteData[1].id!);

            // pull again
            await syncService.pull(undefined, true);
            expect(getRowCountInsideNotebook()).toBe(3);
            expect(getLocalItemField(id, remote)).toBe(remoteData[2].id!);
            expect(getLocalItemField(id, local)).not.toBe(remoteData[1].id!);

            testPushIndicator(false);
          });
        });
      });
    });

    describe('on push operation', () => {
      it('should only push notebook on first push if collection is empty', async () => {
        expect(getRowCountInsideNotebook()).toBe(0);
        await syncService_push();
        const remoteContent = await driver.getContent();
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
        const remoteContent = await driver.getContent();
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
        const remoteContent = await driver.getContent();
        expect(remoteContent.content).toHaveLength(4); // 3 + 1 notebook
        expect(getDocsFolders(remoteContent.content)).toHaveLength(3);
      });

      it('should push everything on first push if remote has nothing', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(3);
        await syncService_push();
        const remoteContent = driver.getContent();
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
        const remoteContent = await driver.getContent();
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
            const remoteContent = await driver.getContent();
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
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(remoteData.length - 1);

            testPushIndicator(false);
          });

          GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
            it(`should update remote ${type}s if they are updated locally with ${field} and unchanged on remote`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // update item locally then push
              setLocalItemField(id, field, remoteData[2].id!);
              await syncService_push();

              // item has been updated
              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(remoteData.length);
              expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
                remoteData[2].id!
              );
              testPushIndicator(false);
            });

            it(`should delete remote ${type}s if they are updated with ${field} on remote then erased locally`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;

              // change remote
              updateOnRemote(remoteData, id, field);
              await reInitRemoteData(remoteData);

              // delete item locally then push
              collectionService_deleteItem(id);
              await syncService_push();

              // item has been erased
              const remoteContent = await driver.getContent();
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
              updateOnRemote(remoteData, id, field);
              await reInitRemoteData(remoteData);

              await syncService_push();

              // item has been erased
              const remoteContent = await driver.getContent();
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
              setLocalItemField(id!, field, remoteData[2].id!);
              // push
              await syncService_push();

              // item has been recreated
              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(remoteData.length);
              expect(
                getRemoteItemField(remoteContent.content, id!, field)
              ).toBe(remoteData[2].id!);

              testPushIndicator(false);
            });

            it(`should not update ${type}s unchanged on local even if updated remotely with ${field} (server wins)`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();

              // change remote
              const id = remoteData[0].id!;
              updateOnRemote(remoteData, id, field);
              await reInitRemoteData(remoteData);

              // push
              await syncService_push();

              // item has not been changed on remote
              const remoteContent = await driver.getContent();
              expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
                'newRemote'
              );
              testPushIndicator(false);
            });
          });

          GET_ALL_CHANGES(type).forEach(({ local, remote }) => {
            it(`should update ${type} when localChange=${local} then remoteChange=${remote}: local wins`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;
              // change local
              setLocalItemField(id, local, remoteData[2].id!);
              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);
              // push
              await syncService_push();

              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(remoteData.length);
              if (remote !== local) {
                expect(
                  getRemoteItemField(remoteContent.content, id, remote)
                ).not.toBe(remoteData[2].id!);
              }
              expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
                remoteData[2].id!
              );

              testPushIndicator(false);
            });

            it(`should update ${type} when remoteChange=${remote} then localChange=${local}: local wins`, async () => {
              const remoteData = getSomeRemoteData(type, testAddFn);
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = remoteData[0].id!;
              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);
              // change local
              setLocalItemField(id, local, remoteData[2].id!);

              // push
              await syncService_push();
              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(remoteData.length);
              expect(
                getRemoteItemField(remoteContent.content, id, remote)
              ).not.toBe('newRemote');
              expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
                remoteData[2].id!
              );
              testPushIndicator(false);
            });
          });

          if (type === 'document') {
            CONFLICT_CHANGES.forEach(({ local, remote }) => {
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
                setLocalItemField(id, local, remoteData[1].id!);
                updateOnRemote(remoteData, id, remote, remoteData[2].id!);
                await reInitRemoteData(remoteData);
                await syncService_pull();

                expect(getLocalItemConflicts()).toHaveLength(1);
                expect(getRowCountInsideNotebook()).toBe(4); // a conflict file was created

                // conflict should not be pushed, remote value is kept
                await syncService_push();
                const remoteContent = await driver.getContent();
                expect(remoteContent.content).toHaveLength(4);
                expect(
                  getRemoteItemField(remoteContent.content, id, remote)
                ).toBe(remoteData[2].id!);
                expect(
                  getRemoteItemField(remoteContent.content, id, local)
                ).not.toBe(remoteData[1].id!);
                testPushIndicator(false);
              });
            });
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
        const remoteContent = await driver.getContent();
        expect(remoteContent.content).toHaveLength(5);
      });
    });

    describe('on force-push operation', () => {
      it('should push nothing the first push if collection is empty', async () => {
        expect(getRowCountInsideNotebook()).toBe(0);
        await syncService.push(undefined, true);
        const remoteContent = await driver.getContent();
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
        const remoteContent = await driver.getContent();
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
        const remoteContent = await driver.getContent();
        expect(remoteContent.content).toHaveLength(5);
        expect(getDocsFolders(remoteContent.content)).toHaveLength(4);
      });

      it('should push everything on first push if remote has nothing', async () => {
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addDocument(DEFAULT_NOTEBOOK_ID);
        collectionService_addFolder(DEFAULT_NOTEBOOK_ID);
        expect(getRowCountInsideNotebook()).toBe(3);
        await syncService.push(undefined, true);
        const remoteContent = driver.getContent();
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
        const remoteContent = await driver.getContent();
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
          const remoteContent = await driver.getContent();
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
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(4);

          testPushIndicator(false);
        });

        GET_UPDATABLE_FIELDS(type).forEach(({ field }) => {
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
            setLocalItemField(id, field, 'newLocal');
            await syncService.push(undefined, true);

            // item has been updated
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(4);
            expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
              'newLocal'
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
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService_deleteItem(id);
            await syncService.push(undefined, true);

            // item has been erased
            const remoteContent = await driver.getContent();
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
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            await syncService.push(undefined, true);

            // item has been erased
            const remoteContent = await driver.getContent();
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
            setLocalItemField(id!, field, 'newLocal');
            // push
            await syncService.push(undefined, true);

            // item has been recreated
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(4);
            expect(getRemoteItemField(remoteContent.content, id!, field)).toBe(
              'newLocal'
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
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // push
            await syncService.push(undefined, true);

            // item has been changed on remote
            const remoteContent = await driver.getContent();
            expect(
              getRemoteItemField(remoteContent.content, id, field)
            ).not.toBe('newRemote');
            testPushIndicator(false);
          });
        });

        GET_ALL_CHANGES(type).forEach(({ local, remote }) => {
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
            setLocalItemField(id, local, 'newLocal');
            // change remote
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);
            // push
            await syncService.push(undefined, true);

            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(4);
            if (remote !== local) {
              expect(
                getRemoteItemField(remoteContent.content, id, remote)
              ).not.toBe('newLocal');
            }
            expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
              'newLocal'
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
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);
            // change local
            setLocalItemField(id, local, 'newLocal');

            // push
            await syncService.push(undefined, true);
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(4);
            expect(
              getRemoteItemField(remoteContent.content, id, remote)
            ).not.toBe('newRemote');
            expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
              'newLocal'
            );
            testPushIndicator(false);
          });
        });
      });

      CONFLICT_CHANGES.forEach(({ local, remote }) => {
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
          setLocalItemField(id, local, remoteData[1].id!);
          updateOnRemote(remoteData, id, remote, remoteData[2].id!);
          await reInitRemoteData(remoteData);
          await syncService_pull();
          expect(getRowCountInsideNotebook()).toBe(4); // a conflict file was created

          // conflict should not be pushed, remote value is kept
          await syncService.push(undefined, true);
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(4);
          expect(getRemoteItemField(remoteContent.content, id, remote)).toBe(
            remoteData[2].id!
          );
          expect(getRemoteItemField(remoteContent.content, id, local)).not.toBe(
            remoteData[1].id!
          );
          testPushIndicator(false);
        });
      });
    });
  });
  // });
});
