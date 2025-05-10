import { CollectionItem } from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/localChanges.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { LocalChangeType } from '@/db/types/store-types';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { LayerTypes } from '@/remote-storage/storage-provider.factory';
import { syncService } from '@/remote-storage/sync.service';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expectHasLocalItemConflict,
  fakeTimersDelay,
  getCollectionRowCount,
  getCollectionRowIds,
  getFirstLocalItem,
  getLocalItemByTitle,
  getLocalItemConflict,
  getLocalItemConflicts,
  getLocalItemField,
  getRemoteItemField,
  NON_PARENT_CHANGES,
  oneDocument,
  oneFolder,
  PARENT_CHANGES,
  setLocalItemField,
  UPDATABLE_FIELDS,
  updateOnRemote
} from '../setup/test.utils';

let driver: InMemDriver;
let iPull = 0;
let iPush = 0;

const reInitRemoteData = async (items: CollectionItem[], updateTs?: number) => {
  vi.advanceTimersByTime(fakeTimersDelay);
  const lastLocalChange =
    updateTs !== undefined ? updateTs : Math.max(...items.map(i => i.updated));
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

describe('sync service', () => {
  [{ layer: 'simple' } /*, { layer: 'bucket' } */].forEach(({ layer }) => {
    describe(`with ${layer} layer`, () => {
      beforeEach(async () => {
        remotesService['layer'] = layer as LayerTypes;
        remotesService.addRemote('test', 0, 'inmem', {});
        await remotesService.initSyncConnection(
          storageService.getSpaceId(),
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
        const { result } = renderHook(() =>
          syncService.usePrimaryHasLocalChanges()
        );
        expect(result.current).toBeFalsy();
      });

      it('should tell if there is are local changes', () => {
        collectionService_addFolder(ROOT_FOLDER);
        const { result } = renderHook(() =>
          syncService.usePrimaryHasLocalChanges()
        );
        expect(result.current).toBeTruthy();
      });

      it('should pull new remote items, create newer, then push', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3')
        ];
        await reInitRemoteData(remoteData);
        await syncService_pull();
        expect(getCollectionRowCount()).toBe(3);
        collectionService_addFolder(ROOT_FOLDER);
        await syncService_push();
        const remoteContent = await driver.getContent();
        expect(remoteContent.content).toHaveLength(4);
        expect(remoteContent.content.map(r => r.title)).toEqual([
          'r1',
          'r2',
          'r3',
          'New folder'
        ]);
        expect(getCollectionRowCount()).toBe(4);
      });

      it('should handle missing file info if remote has been initialized elsewhere', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3')
        ];
        await reInitRemoteData(remoteData);
        await syncService_pull();
        expect(getCollectionRowCount()).toBe(3);
      });

      it('should create version file on first init', async () => {
        const { content } = await driver.pullFile('', 'S1');
        expect(content).toBe('0');
      });

      describe('on pull operation', () => {
        it('should do nothing on first pull if remote has nothing', async () => {
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(0);
        });

        it('should pull everything on first pull if remote has content', async () => {
          await reInitRemoteData([oneDocument(), oneDocument(), oneFolder()]);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(3);
        });

        it('should pull new remote items without erasing newly created items', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          // create local items
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(2);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(5);
          expect(getLocalItemConflicts()).toHaveLength(0);

          // indicator should still tell if push allowed
          testPushIndicator(true);
        });

        it('should pull new remote items without erasing existing items', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          // create local items
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(2);
          localChangesService.clearLocalChanges();
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(3);

          // indicator should still tell if push allowed
          testPushIndicator(false);
        });

        it('should pull new remote items several times without erasing newly created items ', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          // create local items
          collectionService_addDocument(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(1);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(4);
          expect(getLocalItemConflicts()).toHaveLength(0);

          // update remote again
          await reInitRemoteData([...remoteData, oneDocument('r4')]);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(5);
          expect(getLocalItemConflicts()).toHaveLength(0);

          // indicator should still tell if push allowed
          testPushIndicator(true);
        });

        it('should erase existing items if they have been pushed, when changing remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);

          // create local items
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(2);
          localChangesService.clearLocalChanges(); // clear changes -> it's like they have been pushed

          // pull items from new remote
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(3);

          testPushIndicator(false);
        });

        it('should delete local items on pull if they have not been changed and erased on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(3);

          // erase on remote
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(2);
          testPushIndicator(false);
        });

        it('should not recreate items erased locally on pull if they have not changed on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(3);
          // erase locally
          const id = getFirstLocalItem();
          collectionService_deleteItem(id);

          // pull again
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(2);

          testPushIndicator(true);
        });

        UPDATABLE_FIELDS.forEach(({ field }) => {
          it(`should pull updates on second pull if remote has been updated with ${field}`, async () => {
            const remoteData = [oneDocument('r1'), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);

            const id = getLocalItemByTitle('r1')!;
            // change remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(collectionService.itemExists(id!)).toBeTruthy();
            expect(getLocalItemField(id!, field)).toBe('newRemote');
          });

          it(`should not delete local updates of field ${field} if they have not changed on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);
            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field, 'newLocal');

            // pull again
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, field)).toBe('newLocal');

            testPushIndicator(true);
          });

          it(`should not delete local items on pull if they have been changed with ${field} before being erased on remote (conflict)`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);

            // update locally
            const id = remoteData[0].id!;
            setLocalItemField(id, field, 'newLocal');
            vi.advanceTimersByTime(50);

            // erase on remote
            await reInitRemoteData([remoteData[1], remoteData[2]], Date.now());
            await syncService_pull();

            // conflict has been created
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemConflicts()).toHaveLength(1);
            expect(collectionService.itemExists(id)).toBeFalsy();

            const conflictId = getLocalItemConflict()!;
            expect(getLocalItemField(conflictId, field)).toBe('newLocal');
            testPushIndicator(true); // TODO: ideally, should be false

            // push, no conflict should be pushed
            await syncService_push();
            let remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(2);
            testPushIndicator(false);

            // now, solve conflict
            setLocalItemField(conflictId, 'content', 'new content');
            testPushIndicator(true);
            expect(getLocalItemConflicts()).toHaveLength(0);

            await syncService_push();
            remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);

            testPushIndicator(false);
          });

          it(`should not delete local items on pull if they have been changed with ${field} after being erased on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);

            // erase on remote
            await reInitRemoteData([remoteData[1], remoteData[2]], Date.now());

            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field, 'newLocal');

            await syncService_pull();

            // item is unchanged
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemConflicts()).toHaveLength(0);
            expect(getLocalItemField(id, field)).toBe('newLocal');
            testPushIndicator(true);
          });

          it(`should recreate items erased locally on pull if they have changed on remote with ${field} after delete`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);

            const id = getFirstLocalItem();
            // erase locally
            collectionService_deleteItem(id);

            // update on remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(field === 'parent' ? 2 : 3);
            if (field !== 'parent') {
              // parent is a special case since the timestamp is not updated
              expect(getLocalItemField(id, field)).toBe('newRemote');
            }

            testPushIndicator(true);
          });

          it(`should not recreate items erased locally on pull if they have changed on remote with ${field} before delete`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);

            const id = getFirstLocalItem();
            // update on remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // erase locally
            collectionService_deleteItem(id);

            // pull again
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(2);
            expect(collectionService.itemExists(id)).toBeFalsy();

            testPushIndicator(true);
          });
        });

        // fields that can change: parent, title, content, deleted
        NON_PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should create conflict if localChange=${local} then remoteChange=${remote}`, async () => {
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull(); // 1
            const id = getFirstLocalItem();

            // change local
            setLocalItemField(id, local, 'newLocal');

            // change remote
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService_pull(); // 2
            // a conflict file was created
            expect(getCollectionRowCount()).toBe(4);
            expect(getLocalItemField(id, remote)).toBe('newRemote');
            expect(getLocalItemField(id, local)).not.toBe('newLocal');

            // check that a conflict file exists
            const conflictId = getLocalItemConflict();
            expect(conflictId).toBeDefined();
            testPushIndicator(true);

            // pull again
            await syncService_pull(); // 3
            // conflict was erased! yet a new one took its place
            expect(getCollectionRowCount()).toBe(4);
            expectHasLocalItemConflict(conflictId!, false);
            const conflictId2 = getLocalItemConflict();
            expect(conflictId2).toBeDefined();
            expect(conflictId2).not.toBe(conflictId);

            // update the conflict => will remove its 'conflict' flag
            setLocalItemField(
              conflictId2!,
              'title',
              'conflict file updated only'
            );
            expect(localChangesService.getLocalChanges()).toHaveLength(2);
            const lc = localChangesService
              .getLocalChanges()
              .find(lc => lc.item === conflictId2);
            expect(lc).toBeDefined();
            expect(lc?.change).toBe(LocalChangeType.add);
            // after update, conflict is no longer one
            expect(collectionService.itemExists(conflictId!)).toBeFalsy();
            expect(collectionService.itemExists(conflictId2!)).toBeTruthy();
            expect(collectionService.isItemConflict(conflictId2!)).toBeFalsy();

            // pull again
            await syncService_pull(); // 4
            // conflict was not solved by a new timestamp, so, new conflict
            expect(getCollectionRowCount()).toBe(5);
            const conflictId3 = getLocalItemConflict();
            expect(conflictId3).not.toBe(conflictId2);

            // solve the conflict at last
            expect(collectionService.itemExists(id)).toBeTruthy();
            setLocalItemField(id, local, 'conflict updated');

            // pull again
            await syncService_pull(); // 5
            // conflict was solved by a new timestamp, so no new conflict, old one was deleted
            expect(getCollectionRowCount()).toBe(4);
            expect(collectionService.itemExists(conflictId2!)).toBeTruthy();
            expect(collectionService.itemExists(conflictId3!)).toBeFalsy();
          });

          it(`should apply local change when remoteChange=${remote} then localChange=${local} (local wins)`, async () => {
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);

            // change local
            setLocalItemField(id, local, 'newLocal');

            // pull again
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, remote)).not.toBe('newRemote');
            expect(getLocalItemField(id, local)).toBe('newLocal');

            testPushIndicator(true);
          });
        });

        // parent change is a special case where the 'update' ts isn't updated
        PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should be undetermined when localChange=${local} then remoteChange=${remote}`, async () => {
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // change local
            setLocalItemField(id, local, 'newLocal');

            // change remote
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService_pull();

            // not ideal, to handle in another way with mergeable fields
            if (local === 'parent' && remote !== 'parent') {
              expect(getCollectionRowCount()).toBe(4); // conflict
              expect(getLocalItemField(id, remote)).toBe('newRemote');
              expect(getLocalItemField(id, local)).not.toBe('newLocal');
            } else {
              expect(getCollectionRowCount()).toBe(3); // no conflict
              expect(getLocalItemField(id, remote)).not.toBe('newRemote');
              expect(getLocalItemField(id, local)).toBe('newLocal');
            }

            testPushIndicator(true); // not ideal but should be better handled with mergeable fields
          });

          it(`should apply parent change when remoteChange=${remote} then localChange=${local} (parent wins)`, async () => {
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);

            // change local
            setLocalItemField(id, local, 'newLocal');

            // pull again
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, remote)).not.toBe('newRemote');
            expect(getLocalItemField(id, local)).toBe('newLocal');

            testPushIndicator(true); // not ideal but should be better handled with mergeable fields
          });
        });

        // TODO: test several pull when merging updated items
      });

      describe('on force-pull operation', () => {
        it('should pull everything on first pull if remote has content', async () => {
          await reInitRemoteData([oneDocument(), oneDocument(), oneFolder()]);
          await syncService.pull(undefined, true);
          expect(getCollectionRowCount()).toBe(3);
        });

        it('should erase all created local items on force pull', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          // create local items
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(2);
          await syncService.pull(undefined, true);
          expect(getCollectionRowCount()).toBe(3);
          expect(getCollectionRowIds()).toStrictEqual(
            remoteData.map(r => r.id)
          );

          testPushIndicator(false);
        });

        it('should erase all existing local items on force pull', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          // create local items
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(2);
          localChangesService.clearLocalChanges();
          await syncService.pull(undefined, true);
          expect(getCollectionRowCount()).toBe(3);
          expect(getCollectionRowIds()).toStrictEqual(
            remoteData.map(r => r.id)
          );

          testPushIndicator(false);
        });

        it('should recreate all erased local items on force pull', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();
          expect(getCollectionRowCount()).toBe(3);

          // erase locally
          const id = getFirstLocalItem();
          collectionService_deleteItem(id);

          // pull again
          await syncService.pull(undefined, true);
          expect(getCollectionRowCount()).toBe(3);

          testPushIndicator(false);
        });

        UPDATABLE_FIELDS.forEach(({ field }) => {
          it(`should erase local updates of field ${field} if they have not changed on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull(undefined, true);
            expect(getCollectionRowCount()).toBe(3);
            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field, 'newLocal');

            // pull again
            await syncService.pull(undefined, true);
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, field)).not.toBe('newLocal');

            testPushIndicator(false);
          });

          it(`should pull updates on second pull if remote has been updated with ${field}`, async () => {
            const remoteData = [oneDocument('r1'), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull(undefined, true);
            expect(getCollectionRowCount()).toBe(3);

            const id = getLocalItemByTitle('r1')!;
            // change remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull(undefined, true);
            expect(getCollectionRowCount()).toBe(3);
            expect(collectionService.itemExists(id));
            expect(getLocalItemField(id, field)).toBe('newRemote');
          });

          it(`should delete local items on pull even if they have been changed with ${field} after being erased on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(3);

            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field, 'newLocal');

            // erase on remote
            await reInitRemoteData([remoteData[1], remoteData[2]]);
            await syncService.pull(undefined, true);
            expect(getCollectionRowCount()).toBe(2);
            expect(collectionService.itemExists(id)).toBeFalsy();
            testPushIndicator(false);
          });
        });

        [...NON_PARENT_CHANGES, ...PARENT_CHANGES].forEach(
          ({ local, remote }) => {
            it(`should use server version when localChange=${local} then remoteChange=${remote}`, async () => {
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = getFirstLocalItem();

              // change local
              setLocalItemField(id, local, 'newLocal');

              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);

              // pull again
              await syncService.pull(undefined, true);
              expect(getCollectionRowCount()).toBe(3); // no conflict file was created
              expect(getLocalItemField(id, remote)).toBe('newRemote');
              expect(getLocalItemField(id, local)).not.toBe('newLocal');

              testPushIndicator(false);
            });

            it(`should use server version when remoteChange=${remote} then localChange=${local}`, async () => {
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = getFirstLocalItem();

              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);

              // change local
              setLocalItemField(id, local, 'newLocal');

              // pull again
              await syncService.pull(undefined, true);
              expect(getCollectionRowCount()).toBe(3);
              expect(getLocalItemField(id, remote)).toBe('newRemote');
              expect(getLocalItemField(id, local)).not.toBe('newLocal');

              testPushIndicator(false);
            });
          }
        );
      });

      describe('on push operation', () => {
        it('should push nothing on first push if collection is empty', async () => {
          expect(getCollectionRowCount()).toBe(0);
          await syncService_push();
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(0);
        });

        it('should push everything on first push even if there are no local changes', async () => {
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          localChangesService.clearLocalChanges();

          await syncService_pull();
          await syncService_push();
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push nothing on second push if there are no local changes', async () => {
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          await syncService_push();

          collectionService_addDocument(ROOT_FOLDER);
          localChangesService.clearLocalChanges();

          await syncService_push();
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push everything on first push if remote has nothing', async () => {
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          await syncService_push();
          const remoteContent = driver.getContent();
          expect(remoteContent.content).toHaveLength(3);

          testPushIndicator(false);
        });

        it('should delete remote items if they are erased locally and unchanged on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();
          const id = getFirstLocalItem();

          // delete item locally then push
          collectionService_deleteItem(id);
          await syncService_push();

          // item has been erased
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(2);

          testPushIndicator(false);
        });

        it('should not recreate items deleted on remote and unchanged locally', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();

          // delete item remotely then push
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService_push();

          // item has not been recreated
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(2);

          testPushIndicator(false);
        });

        it('should not delete items on remote if present on remote but not pulled locally', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();

          // add item remotely then push
          await reInitRemoteData([...remoteData, oneDocument(), oneFolder()]);
          await syncService_push();

          // item have been untouched
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(5);

          testPushIndicator(false);
        });

        UPDATABLE_FIELDS.forEach(({ field }) => {
          it(`should update remote items if they are updated locally with ${field} and unchanged on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // update item locally then push
            setLocalItemField(id, field, 'newLocal');
            await syncService_push();

            // item has been updated
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);
            expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
              'newLocal'
            );
            testPushIndicator(false);
          });

          it(`should delete remote items if they are updated with ${field} on remote then erased locally`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService_deleteItem(id);
            await syncService_push();

            // item has been erased
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(2);

            testPushIndicator(false);
          });

          it(`should delete remote items if they are erased locally then updated with ${field} on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // delete item locally
            collectionService_deleteItem(id);
            // change remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            await syncService_push();

            // item has been erased
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(2);

            testPushIndicator(false);
          });

          it(`should recreate items deleted on remote and changed locally with ${field}`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getLocalItemByTitle('r1');

            // delete item remotely
            await reInitRemoteData([remoteData[1], remoteData[2]]);
            // update locally
            expect(id).toBeDefined();
            setLocalItemField(id!, field, 'newLocal');
            // push
            await syncService_push();

            // item has been recreated
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);
            expect(getRemoteItemField(remoteContent.content, id!, field)).toBe(
              'newLocal'
            );

            testPushIndicator(false);
          });

          it(`should not update items unchanged on local even if updated remotely with ${field} (server wins)`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();

            // change remote
            const id = getFirstLocalItem();
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

        NON_PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should not push conflicts between ${local} and ${remote}: local wins`, async () => {
            // create a conflict
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();
            setLocalItemField(id, local, 'newLocal');
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(4); // a conflict file was created

            // conflict should not be pushed, remote value is kept
            await syncService_push();
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);
            expect(getRemoteItemField(remoteContent.content, id, remote)).toBe(
              'newRemote'
            );
            expect(
              getRemoteItemField(remoteContent.content, id, local)
            ).not.toBe('newLocal');
            testPushIndicator(false);
          });
        });

        [...NON_PARENT_CHANGES, ...PARENT_CHANGES].forEach(
          ({ local, remote }) => {
            it(`should update when localChange=${local} then remoteChange=${remote}: local wins`, async () => {
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = getFirstLocalItem();
              // change local
              setLocalItemField(id, local, 'newLocal');
              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);
              // push
              await syncService_push();

              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(3);
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

            it(`should update when remoteChange=${remote} then localChange=${local}: local wins`, async () => {
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = getFirstLocalItem();
              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);
              // change local
              setLocalItemField(id, local, 'newLocal');

              // push
              await syncService_push();
              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(3);
              expect(
                getRemoteItemField(remoteContent.content, id, remote)
              ).not.toBe('newRemote');
              expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
                'newLocal'
              );
              testPushIndicator(false);
            });
          }
        );
      });

      describe('on force-push operation', () => {
        it('should push nothing the first push if collection is empty', async () => {
          expect(getCollectionRowCount()).toBe(0);
          await syncService.push(undefined, true);
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(0);
        });

        it('should push everything on first push even if there are no local changes', async () => {
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          localChangesService.clearLocalChanges();

          await syncService_pull();
          await syncService.push(undefined, true);
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push everything on second push even if there are no local changes', async () => {
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          await syncService_push();

          collectionService_addDocument(ROOT_FOLDER);
          localChangesService.clearLocalChanges();

          await syncService.push(undefined, true);
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(4);
        });

        it('should push everything on first push if remote has nothing', async () => {
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addDocument(ROOT_FOLDER);
          collectionService_addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          await syncService.push(undefined, true);
          const remoteContent = driver.getContent();
          expect(remoteContent.content).toHaveLength(3);

          testPushIndicator(false);
        });

        it('should delete remote items if they are erased locally and unchanged on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();
          const id = getFirstLocalItem();

          // delete item locally then push
          collectionService_deleteItem(id);
          await syncService.push(undefined, true);

          // item has been erased
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(2);

          testPushIndicator(false);
        });

        it('should recreate items deleted on remote and unchanged locally', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();

          // delete item remotely then push
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService.push(undefined, true);

          // item has been recreated
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);

          testPushIndicator(false);
        });

        it('should delete items on remote if present on remote but not pulled locally', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService_pull();

          // add item remotely then push
          await reInitRemoteData([...remoteData, oneDocument(), oneFolder()]);
          await syncService.push(undefined, true);

          // item have been deleted
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);

          testPushIndicator(false);
        });

        UPDATABLE_FIELDS.forEach(({ field }) => {
          it(`should update remote items if they are updated locally with ${field} and unchanged on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // update item locally then push
            setLocalItemField(id, field, 'newLocal');
            await syncService.push(undefined, true);

            // item has been updated
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);
            expect(getRemoteItemField(remoteContent.content, id, field)).toBe(
              'newLocal'
            );
            testPushIndicator(false);
          });

          it(`should delete remote items if they are updated with ${field} on remote then erased locally`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService_deleteItem(id);
            await syncService.push(undefined, true);

            // item has been erased
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(2);

            testPushIndicator(false);
          });

          it(`should delete remote items if they are erased locally then updated with ${field} on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();

            // delete item locally
            collectionService_deleteItem(id);
            // change remote
            updateOnRemote(remoteData, id, field);
            await reInitRemoteData(remoteData);

            await syncService.push(undefined, true);

            // item has been erased
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(2);

            testPushIndicator(false);
          });

          it(`should recreate items deleted on remote and changed locally with ${field}`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getLocalItemByTitle('r1');

            // delete item remotely
            await reInitRemoteData([remoteData[1], remoteData[2]]);
            // update locally
            expect(id).toBeDefined();
            setLocalItemField(id!, field, 'newLocal');
            // push
            await syncService.push(undefined, true);

            // item has been recreated
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);
            expect(getRemoteItemField(remoteContent.content, id!, field)).toBe(
              'newLocal'
            );

            testPushIndicator(false);
          });

          it(`should update items unchanged on local even if updated remotely with ${field} (local wins)`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService_pull();

            // change remote
            const id = getFirstLocalItem();
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

        NON_PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should not push conflicts between ${local} and ${remote}: local wins`, async () => {
            // create a conflict
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService_pull();
            const id = getFirstLocalItem();
            setLocalItemField(id, local, 'newLocal');
            updateOnRemote(remoteData, id, remote);
            await reInitRemoteData(remoteData);
            await syncService_pull();
            expect(getCollectionRowCount()).toBe(4); // a conflict file was created

            // conflict should not be pushed, remote value is kept
            await syncService.push(undefined, true);
            const remoteContent = await driver.getContent();
            expect(remoteContent.content).toHaveLength(3);
            expect(getRemoteItemField(remoteContent.content, id, remote)).toBe(
              'newRemote'
            );
            expect(
              getRemoteItemField(remoteContent.content, id, local)
            ).not.toBe('newLocal');
            testPushIndicator(false);
          });
        });

        [...NON_PARENT_CHANGES, ...PARENT_CHANGES].forEach(
          ({ local, remote }) => {
            it(`should update when localChange=${local} then remoteChange=${remote}: local wins`, async () => {
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = getFirstLocalItem();
              // change local
              setLocalItemField(id, local, 'newLocal');
              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);
              // push
              await syncService.push(undefined, true);

              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(3);
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

            it(`should update when remoteChange=${remote} then localChange=${local}: local wins`, async () => {
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService_pull();
              const id = getFirstLocalItem();
              // change remote
              updateOnRemote(remoteData, id, remote);
              await reInitRemoteData(remoteData);
              // change local
              setLocalItemField(id, local, 'newLocal');

              // push
              await syncService.push(undefined, true);
              const remoteContent = await driver.getContent();
              expect(remoteContent.content).toHaveLength(3);
              expect(
                getRemoteItemField(remoteContent.content, id, remote)
              ).not.toBe('newRemote');
              expect(getRemoteItemField(remoteContent.content, id, local)).toBe(
                'newLocal'
              );
              testPushIndicator(false);
            });
          }
        );
      });
    });
  });
});
