import { CollectionItem } from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/localChanges.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { LayerTypes } from '@/remote-storage/storage-layer.factory';
import { syncService } from '@/remote-storage/sync.service';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  expectHasLocalItemConflict,
  getCollectionRowCount,
  getCollectionRowIds,
  getFirstLocalItem,
  getLocalItemByTitle,
  getLocalItemConflict,
  getLocalItemField,
  getRemoteItemField,
  NON_PARENT_CHANGES,
  oneDocument,
  oneFolder,
  PARENT_CHANGES,
  setLocalItemField,
  UPDATABLE_FIELDS,
  updateOnRemote
} from './setup/test.utils';

let driver = new InMemDriver();
const reInitRemoteData = async (items: CollectionItem[]) => {
  await driver.setContent(items);
};

const testPushIndicator = (res: boolean) => {
  const { result } = renderHook(() => syncService.usePrimaryHasLocalChanges());
  expect(result.current).toBe(res);
};

describe('sync service', () => {
  [{ layer: 'simple' } /*, { layer: 'bucket' } */].forEach(({ layer }) => {
    describe(`with ${layer} layer`, () => {
      beforeEach(async () => {
        driver = new InMemDriver();
        driver.reset();
        driver.configure({ name: layer });
        remotesService['layer'] = layer as LayerTypes;
        remotesService.addRemote('test', 0, 'inmem', { name: layer });
        await remotesService.initSyncConnection(
          storageService.getSpaceId(),
          true
        );
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
        collectionService.addFolder(ROOT_FOLDER);
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
        await syncService.pull();
        expect(getCollectionRowCount()).toBe(3);
        collectionService.addFolder(ROOT_FOLDER);
        await syncService.push();
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

      it('when changing remote, should erase existing items if they have been pushed', async () => {
        const remoteData = [
          oneDocument('r1'),
          oneDocument('r2'),
          oneFolder('r3')
        ];
        await reInitRemoteData(remoteData);

        // create local items
        collectionService.addDocument(ROOT_FOLDER);
        collectionService.addFolder(ROOT_FOLDER);
        expect(getCollectionRowCount()).toBe(2);
        localChangesService.clearLocalChanges(); // clear changes -> it's like they have been pushed

        // pull items from new remote
        await syncService.pull();
        expect(getCollectionRowCount()).toBe(3);

        testPushIndicator(false);
      });

      describe('on pull operation', () => {
        it('should do nothing on first pull if remote has nothing', async () => {
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(0);
        });

        it('should pull everything on first pull if remote has content', async () => {
          await reInitRemoteData([oneDocument(), oneDocument(), oneFolder()]);
          await syncService.pull();
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
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(2);
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(5);

          // indicator should still tell if push allowed
          testPushIndicator(true);
        });

        it('should pull new remote items several times without erasing newly created items ', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          // create local items
          collectionService.addDocument(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(1);
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(4);

          // update remote again
          await reInitRemoteData([...remoteData, oneDocument('r4')]);
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(5);

          // indicator should still tell if push allowed
          testPushIndicator(true);
        });

        it('should delete local items on pull if they have not been changed and erased on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(3);

          // erase on remote
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService.pull();
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
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(3);
          // erase locally
          const id = getFirstLocalItem();
          collectionService.deleteItem(id);

          // pull again
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(2);

          testPushIndicator(true);
        });

        UPDATABLE_FIELDS.forEach(({ field }) => {
          it(`should pull updates on second pull if remote has been updated with ${field}`, async () => {
            const remoteData = [oneDocument('r1'), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            const id = getLocalItemByTitle('r1')!;
            // change remote
            updateOnRemote(remoteData, id, field, 50);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(collectionService.itemExists(id!)).toBeTruthy();
            expect(getLocalItemField(id!, field)).toBe('newRemote');
          });

          it(`should not delete local items on pull if they have been changed with ${field} after being erased on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field);

            // erase on remote
            await reInitRemoteData([remoteData[1], remoteData[2]]);
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            // item is unchanged
            expect(getLocalItemField(id, field)).toBe('newLocal');
            testPushIndicator(true);
          });

          it(`should not delete local updates of field ${field} if they have not changed on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);
            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field, 'newLocal');

            // pull again
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, field)).toBe('newLocal');

            testPushIndicator(true);
          });

          it(`should not delete local items on pull if they have been changed with ${field} before being erased on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            // erase on remote
            await reInitRemoteData([remoteData[1], remoteData[2]]);

            // update locally
            const id = getFirstLocalItem();
            setLocalItemField(id, field, 'newLocal');

            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            // item is unchanged
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
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            const id = getFirstLocalItem();
            // erase locally
            collectionService.deleteItem(id);

            // update on remote
            updateOnRemote(remoteData, id, field, 50);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, field)).toBe('newRemote');

            testPushIndicator(true);
          });

          it(`should recreate items erased locally on pull if they have changed on remote with ${field} before delete`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            console.debug('first pull');
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);

            console.debug('remote gets updated');
            const id = getFirstLocalItem();
            // update on remote
            updateOnRemote(remoteData, id, field, -50);
            await reInitRemoteData(remoteData);

            console.debug('item gets erased locally');
            // erase locally
            collectionService.deleteItem(id);

            // pull again
            console.debug('second pull');
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, field)).toBe('newRemote');

            testPushIndicator(true);
          });
        });

        // TODO: test several pull with deleted changes locally

        // fields that can change: parent, title, content, deleted
        NON_PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should create conflict if localChange=${local} then remoteChange=${remote}`, async () => {
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            const id = getFirstLocalItem();

            // change local
            setLocalItemField(id, local, 'newLocal');

            // change remote
            updateOnRemote(remoteData, id, remote, 500);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull();
            // a conflict file was created
            expect(getCollectionRowCount()).toBe(4);
            expect(getLocalItemField(id, remote)).toBe('newRemote');
            expect(getLocalItemField(id, local)).not.toBe('newLocal');

            // check that a conflict file exists
            const conflictId = getLocalItemConflict();
            expect(conflictId).toBeDefined();
            testPushIndicator(true);

            // pull again
            await syncService.pull();
            // conflict was erased! yet a new one took its place
            expect(getCollectionRowCount()).toBe(4);
            expectHasLocalItemConflict(conflictId!, false);
            const conflictId2 = getLocalItemConflict();
            expect(conflictId2).toBeDefined();
            expect(conflictId2).not.toBe(conflictId);

            // update the conflict => will remove its 'conflict' flag
            collectionService.setItemTitle(
              conflictId2!,
              'conflict file updated only'
            );
            expect(localChangesService.getLocalChanges()).toHaveLength(2);
            // after update, conflict is no longer one
            expect(collectionService.isItemConflict(conflictId!)).toBeFalsy();

            // pull again
            await syncService.pull();
            // conflict was not solved by a new timestamp, so, new conflict
            expect(getCollectionRowCount()).toBe(5);

            // solve the conflict at last
            expect(collectionService.itemExists(id)).toBeTruthy();
            setLocalItemField(id, local, 'conflict updated');
            // pull again
            await syncService.pull();
            // conflict was solved by a new timestamp, so no new conflict
            expect(getCollectionRowCount()).toBe(5);
          });

          it(`should apply local change when remoteChange=${remote} then localChange=${local} (local wins)`, async () => {
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, remote, -50);
            await reInitRemoteData(remoteData);

            // change local
            setLocalItemField(id, local, 'newLocal');

            // pull again
            await syncService.pull();
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
            await syncService.pull();
            const id = getFirstLocalItem();

            // change local
            setLocalItemField(id, local, 'newLocal');

            // change remote
            updateOnRemote(remoteData, id, remote, 500);
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull();

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
            await syncService.pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, remote, -50);
            await reInitRemoteData(remoteData);

            // change local
            setLocalItemField(id, local, 'newLocal');

            // pull again
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(3);
            expect(getLocalItemField(id, remote)).not.toBe('newRemote');
            expect(getLocalItemField(id, local)).toBe('newLocal');

            testPushIndicator(true); // not ideal but should be better handled with mergeable fields
          });
        });

        // TODO: test several pull when merging updated items
      });

      // TODO: one big test with several types of change on remote and local at once

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
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
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
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
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
          await syncService.pull();
          expect(getCollectionRowCount()).toBe(3);

          // erase locally
          const id = getFirstLocalItem();
          collectionService.deleteItem(id);

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
            updateOnRemote(remoteData, id, field, 500);
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
            await syncService.pull();
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
              await syncService.pull();
              const id = getFirstLocalItem();

              // change local
              setLocalItemField(id, local, 'newLocal');

              // change remote
              updateOnRemote(remoteData, id, remote, 500);
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
              await syncService.pull();
              const id = getFirstLocalItem();

              // change remote
              updateOnRemote(remoteData, id, remote, -50);
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
          await syncService.push();
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(0);
        });

        it('should push everything on first push even if there are no local changes', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          localChangesService.clearLocalChanges();

          await syncService.pull();
          await syncService.push();
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push nothing on second push if there are no local changes', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          await syncService.push();

          collectionService.addDocument(ROOT_FOLDER);
          localChangesService.clearLocalChanges();

          await syncService.push();
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push everything on first push if remote has nothing', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          await syncService.push();
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
          await syncService.pull();
          const id = getFirstLocalItem();

          // delete item locally then push
          collectionService.deleteItem(id);
          await syncService.push();

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
          await syncService.pull();

          // delete item remotely then push
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService.push();

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
          await syncService.pull();

          // add item remotely then push
          await reInitRemoteData([...remoteData, oneDocument(), oneFolder()]);
          await syncService.push();

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
            await syncService.pull();
            const id = getFirstLocalItem();

            // update item locally then push
            setLocalItemField(id, field, 'newLocal');
            await syncService.push();

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
            await syncService.pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, field, -500);
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService.deleteItem(id);
            await syncService.push();

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
            await syncService.pull();
            const id = getFirstLocalItem();

            // delete item locally
            collectionService.deleteItem(id);
            // change remote
            updateOnRemote(remoteData, id, field, 500);
            await reInitRemoteData(remoteData);

            await syncService.push();

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
            await syncService.pull();
            const id = getLocalItemByTitle('r1');

            // delete item remotely
            await reInitRemoteData([remoteData[1], remoteData[2]]);
            // update locally
            expect(id).toBeDefined();
            setLocalItemField(id!, field, 'newLocal');
            // push
            await syncService.push();

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
            await syncService.pull();

            // change remote
            const id = getFirstLocalItem();
            updateOnRemote(remoteData, id, field, 500);
            await reInitRemoteData(remoteData);

            // push
            await syncService.push();

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
            await syncService.pull();
            const id = getFirstLocalItem();
            setLocalItemField(id, local, 'newLocal');
            updateOnRemote(remoteData, id, remote, 500);
            await reInitRemoteData(remoteData);
            await syncService.pull();
            expect(getCollectionRowCount()).toBe(4); // a conflict file was created

            // conflict should not be pushed, remote value is kept
            await syncService.push();
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
              await syncService.pull();
              const id = getFirstLocalItem();
              // change local
              setLocalItemField(id, local, 'newLocal');
              // change remote
              updateOnRemote(remoteData, id, remote, 500);
              await reInitRemoteData(remoteData);
              // push
              await syncService.push();

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
              await syncService.pull();
              const id = getFirstLocalItem();
              // change remote
              updateOnRemote(remoteData, id, remote, -50);
              await reInitRemoteData(remoteData);
              // change local
              setLocalItemField(id, local, 'newLocal');

              // push
              await syncService.push();
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
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(getCollectionRowCount()).toBe(3);
          localChangesService.clearLocalChanges();

          await syncService.pull();
          await syncService.push(undefined, true);
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push everything on second push even if there are no local changes', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          await syncService.push();

          collectionService.addDocument(ROOT_FOLDER);
          localChangesService.clearLocalChanges();

          await syncService.push(undefined, true);
          const remoteContent = await driver.getContent();
          expect(remoteContent.content).toHaveLength(4);
        });

        it('should push everything on first push if remote has nothing', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
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
          await syncService.pull();
          const id = getFirstLocalItem();

          // delete item locally then push
          collectionService.deleteItem(id);
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
          await syncService.pull();

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
          await syncService.pull();

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
            await syncService.pull();
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
            await syncService.pull();
            const id = getFirstLocalItem();

            // change remote
            updateOnRemote(remoteData, id, field, -500);
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService.deleteItem(id);
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
            await syncService.pull();
            const id = getFirstLocalItem();

            // delete item locally
            collectionService.deleteItem(id);
            // change remote
            updateOnRemote(remoteData, id, field, 500);
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
            await syncService.pull();
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
            await syncService.pull();

            // change remote
            const id = getFirstLocalItem();
            updateOnRemote(remoteData, id, field, 500);
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
            await syncService.pull();
            const id = getFirstLocalItem();
            setLocalItemField(id, local, 'newLocal');
            updateOnRemote(remoteData, id, remote, 500);
            await reInitRemoteData(remoteData);
            await syncService.pull();
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
              await syncService.pull();
              const id = getFirstLocalItem();
              // change local
              setLocalItemField(id, local, 'newLocal');
              // change remote
              updateOnRemote(remoteData, id, remote, 500);
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
              await syncService.pull();
              const id = getFirstLocalItem();
              // change remote
              updateOnRemote(remoteData, id, remote, -50);
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
