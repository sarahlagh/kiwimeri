import {
  CollectionItem,
  CollectionItemType,
  CollectionItemUpdatableFieldEnum
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/localChanges.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { LayerTypes } from '@/remote-storage/storage-layer.factory';
import { InMemProvider } from '@/remote-storage/storage-providers/inmem.provider';
import { syncService } from '@/remote-storage/sync.service';
import { renderHook } from '@testing-library/react';
import { getUniqueId } from 'tinybase/with-schemas';
import { beforeEach, describe, expect, it } from 'vitest';

const inmem = new InMemProvider();
const reInitRemoteData = async (items: CollectionItem[]) => {
  await inmem.pushFile(InMemProvider.providerfile, JSON.stringify(items));
};
const oneDocument = (title = 'new doc', parent = ROOT_FOLDER) =>
  ({
    id: getUniqueId(),
    parent,
    type: CollectionItemType.document,
    title,
    content: 'random',
    created: Date.now(),
    updated: Date.now(),
    deleted: false
  }) as CollectionItem;
const oneFolder = (title = 'new folder', parent = ROOT_FOLDER) =>
  ({
    id: getUniqueId(),
    parent,
    type: CollectionItemType.folder,
    title,
    created: Date.now(),
    updated: Date.now(),
    deleted: false
  }) as CollectionItem;

const testPushIndicator = (res: boolean) => {
  console.log('remaining local changes', localChangesService.getLocalChanges());
  const { result } = renderHook(() => syncService.usePrimaryHasLocalChanges());
  expect(result.current).toBe(res);
};

const UPDATABLE_FIELDS = [
  { field: 'title' },
  { field: 'content' },
  { field: 'parent' }
];
const NON_PARENT_CHANGES = [
  {
    local: 'title',
    remote: 'title'
  },
  {
    local: 'title',
    remote: 'content'
  },
  {
    local: 'content',
    remote: 'title'
  },
  {
    local: 'content',
    remote: 'content'
  }
];
const PARENT_CHANGES = [
  {
    local: 'parent',
    remote: 'parent'
  },
  {
    local: 'parent',
    remote: 'title'
  },
  {
    local: 'title',
    remote: 'parent'
  }
];

describe('sync service', () => {
  [{ layer: 'simple' } /*, { layer: 'bucket' } */].forEach(({ layer }) => {
    describe(`with ${layer} layer`, () => {
      beforeEach(async () => {
        inmem.reset();
        inmem.configure({ name: layer });
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
        expect(storageService.getSpace().getRowCount('collection')).toBe(3);
        collectionService.addFolder(ROOT_FOLDER);
        await syncService.push();
        const remoteContent = await inmem.pullFile(InMemProvider.providerfile);
        expect(remoteContent.content).toHaveLength(4);
        expect(remoteContent.content.map(r => r.title)).toEqual([
          'r1',
          'r2',
          'r3',
          'New folder'
        ]);
        expect(storageService.getSpace().getRowCount('collection')).toBe(4);
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
        expect(storageService.getSpace().getRowCount('collection')).toBe(2);
        localChangesService.clearLocalChanges(); // clear changes -> it's like they have been pushed

        // pull items from new remote
        await syncService.pull();
        expect(storageService.getSpace().getRowCount('collection')).toBe(3);

        testPushIndicator(false);
      });

      describe('on pull operation', () => {
        it('should do nothing on first pull if remote has nothing', async () => {
          await syncService.pull();
          storageService.getSpace().getRowCount('collection');
          expect(storageService.getSpace().getRowCount('collection')).toBe(0);
        });

        it('should pull everything on first pull if remote has content', async () => {
          await reInitRemoteData([oneDocument(), oneDocument(), oneFolder()]);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
        });

        it('should pull updates on second pull if remote has been updated', async () => {
          const remoteData = [oneDocument('r1'), oneDocument(), oneFolder()];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          let id;
          storageService
            .getSpace()
            .getRowIds('collection')
            .forEach(rowId => {
              if (
                storageService
                  .getSpace()
                  .getCell('collection', rowId, 'title')
                  ?.valueOf() === 'r1'
              ) {
                id = rowId;
              }
            });
          // change remote
          remoteData[0].title = 'new title';
          remoteData[0].updated = Date.now() + 500;
          await reInitRemoteData([remoteData[0], remoteData[1]]);

          // pull again
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          expect(storageService.getSpace().hasRow('collection', id!));
          expect(
            storageService.getSpace().getCell('collection', id!, 'title')
          ).toBe('new title');
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
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(5);

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
          expect(storageService.getSpace().getRowCount('collection')).toBe(1);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(4);

          // update remote again
          await reInitRemoteData([...remoteData, oneDocument('r4')]);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(5);

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
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // erase on remote
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          testPushIndicator(false);
        });

        it('should not delete local items on pull if they have been changed after being erased on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // update locally
          const id = storageService.getSpace().getRowIds('collection')[0];
          collectionService.setItemTitle(id, 'new title');

          // erase on remote
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // item is unchanged
          expect(collectionService.getItemTitle(id)).toBe('new title');
          testPushIndicator(true);
        });

        it('should not delete local items on pull if they have been changed before being erased on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // erase on remote
          await reInitRemoteData([remoteData[1], remoteData[2]]);

          // update locally
          const id = storageService.getSpace().getRowIds('collection')[0];
          collectionService.setItemTitle(id, 'new title');

          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // item is unchanged
          expect(collectionService.getItemTitle(id)).toBe('new title');
          testPushIndicator(true);
        });

        it('should not recreate items erased locally on pull if they have not changed on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          // erase locally
          const id = storageService.getSpace().getRowIds('collection')[0];
          collectionService.deleteItem(id);

          // pull again
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);

          testPushIndicator(true);
        });

        it('should recreate items erased locally on pull if they have changed on remote after delete', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          const id = storageService.getSpace().getRowIds('collection')[0];
          // erase locally
          collectionService.deleteItem(id);

          // update on remote
          remoteData.find(r => r.id === id)!.title = 'new title';
          remoteData.find(r => r.id === id)!.updated = Date.now() + 50;
          await reInitRemoteData(remoteData);

          // pull again
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          expect(collectionService.getItemTitle(id)).toBe('new title');

          testPushIndicator(true);
        });

        it('should recreate items erased locally on pull if they have changed on remote before delete', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          const id = storageService.getSpace().getRowIds('collection')[0];
          // update on remote
          remoteData.find(r => r.id === id)!.title = 'new title';
          remoteData.find(r => r.id === id)!.updated = Date.now() - 50;
          await reInitRemoteData(remoteData);

          // erase locally
          collectionService.deleteItem(id);

          // pull again
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          expect(collectionService.getItemTitle(id)).toBe('new title');

          testPushIndicator(true);
        });

        UPDATABLE_FIELDS.forEach(({ field }) => {
          it(`should not erase local updates of field ${field} if they have not changed on remote`, async () => {
            const remoteData = [
              oneDocument('r1'),
              oneDocument('r2'),
              oneFolder('r3')
            ];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            expect(storageService.getSpace().getRowCount('collection')).toBe(3);
            // update locally
            const id = storageService.getSpace().getRowIds('collection')[0];
            collectionService.setItemField(
              id,
              field as CollectionItemUpdatableFieldEnum,
              'new'
            );

            // pull again
            await syncService.pull();
            expect(storageService.getSpace().getRowCount('collection')).toBe(3);

            expect(
              storageService
                .getSpace()
                .getCell(
                  'collection',
                  id,
                  field as CollectionItemUpdatableFieldEnum
                )
                ?.valueOf()
            ).toBe('new');

            testPushIndicator(true);
          });
        });

        // TODO: test several pull with deleted changes locally

        // fields that can change: parent, title, content, deleted
        NON_PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should create conflict if localChange=${local} then remoteChange=${remote}`, async () => {
            const localKey = local as CollectionItemUpdatableFieldEnum;
            const remoteKey = remote as CollectionItemUpdatableFieldEnum;
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            const id = storageService.getSpace().getRowIds('collection')[0];

            // change local
            collectionService.setItemField(id, localKey, 'newLocal');

            // change remote
            const idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][remoteKey] = 'newRemote' as never;
            remoteData[idx].updated = Date.now() + 500;
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull();
            expect(storageService.getSpace().getRowCount('collection')).toBe(
              4 // a conflict file was created
            );
            expect(
              storageService.getSpace().getRow('collection', id)[remoteKey]
            ).toBe('newRemote');

            expect(
              storageService.getSpace().getRow('collection', id)[localKey]
            ).not.toBe('newLocal');

            // check that a conflict file exists
            let rowIds = storageService.getSpace().getRowIds('collection');
            let conflictId;
            rowIds.forEach(id => {
              if (collectionService.isItemConflict(id)) {
                conflictId = id;
              }
            });
            expect(conflictId).toBeDefined();
            testPushIndicator(true);

            // pull again
            await syncService.pull();
            expect(storageService.getSpace().getRowCount('collection')).toBe(
              4 // conflict was erased! yet a new one took its place
            );
            rowIds = storageService.getSpace().getRowIds('collection');
            expect(rowIds).not.toContain(conflictId);
            let conflictId2;
            rowIds.forEach(id => {
              if (collectionService.isItemConflict(id)) {
                conflictId2 = id;
              }
            });
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
            expect(storageService.getSpace().getRowCount('collection')).toBe(
              5 // conflict was not solved by a new timestamp, so, new conflict
            );

            // solve the conflict at last
            expect(collectionService.itemExists(id)).toBeTruthy();
            collectionService.setItemField(id, localKey, 'conflict updated');
            // pull again
            await syncService.pull();
            console.log(storageService.getSpace().getTable('collection'));
            expect(storageService.getSpace().getRowCount('collection')).toBe(
              5 // conflict was solved by a new timestamp, so no new conflict
            );
          });

          it(`should apply local change when remoteChange=${remote} then localChange=${local} (local wins)`, async () => {
            const localKey = local as CollectionItemUpdatableFieldEnum;
            const remoteKey = remote as CollectionItemUpdatableFieldEnum;
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            const id = storageService.getSpace().getRowIds('collection')[0];

            // change remote
            const idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][remoteKey] = 'newRemote' as never;
            remoteData[idx].updated = Date.now() - 50;
            await reInitRemoteData(remoteData);

            // change local
            collectionService.setItemField(id, localKey, 'newLocal');

            // pull again
            await syncService.pull();
            expect(storageService.getSpace().getRowCount('collection')).toBe(3);
            expect(
              storageService.getSpace().getRow('collection', id)[remoteKey]
            ).not.toBe('newRemote');

            expect(
              storageService.getSpace().getRow('collection', id)[localKey]
            ).toBe('newLocal');

            testPushIndicator(true);
          });
        });

        // parent change is a special case where the 'update' ts isn't updated
        PARENT_CHANGES.forEach(({ local, remote }) => {
          it(`should be undetermined when localChange=${local} then remoteChange=${remote}`, async () => {
            const localKey = local as CollectionItemUpdatableFieldEnum;
            const remoteKey = remote as CollectionItemUpdatableFieldEnum;
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            const id = storageService.getSpace().getRowIds('collection')[0];

            // change local
            collectionService.setItemField(id, localKey, 'newLocal');

            // change remote
            const idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][remoteKey] = 'newRemote' as never;
            if (remoteKey !== 'parent') {
              remoteData[idx].updated = Date.now() + 500;
            }
            await reInitRemoteData(remoteData);

            // pull again
            await syncService.pull();

            // not ideal, to handle in another way with mergeable fields
            if (localKey === 'parent' && remoteKey !== 'parent') {
              expect(storageService.getSpace().getRowCount('collection')).toBe(
                4 // conflict
              );
              expect(
                storageService.getSpace().getRow('collection', id)[remoteKey]
              ).toBe('newRemote');
              expect(
                storageService.getSpace().getRow('collection', id)[localKey]
              ).not.toBe('newLocal');
            } else {
              expect(storageService.getSpace().getRowCount('collection')).toBe(
                3 // no conflict
              );
              expect(
                storageService.getSpace().getRow('collection', id)[remoteKey]
              ).not.toBe('newRemote');
              expect(
                storageService.getSpace().getRow('collection', id)[localKey]
              ).toBe('newLocal');
            }

            testPushIndicator(true); // not ideal but should be better handled with mergeable fields
          });

          it(`should apply parent change when remoteChange=${remote} then localChange=${local} (parent wins)`, async () => {
            const localKey = local as CollectionItemUpdatableFieldEnum;
            const remoteKey = remote as CollectionItemUpdatableFieldEnum;
            const remoteData = [oneDocument(), oneDocument(), oneFolder()];
            await reInitRemoteData(remoteData);
            await syncService.pull();
            const id = storageService.getSpace().getRowIds('collection')[0];

            // change remote
            const idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][remoteKey] = 'newRemote' as never;
            if (remoteKey !== 'parent') {
              remoteData[idx].updated = Date.now() - 50;
            }
            await reInitRemoteData(remoteData);

            // change local
            collectionService.setItemField(id, localKey, 'newLocal');

            // pull again
            await syncService.pull();
            expect(storageService.getSpace().getRowCount('collection')).toBe(3);
            expect(
              storageService.getSpace().getRow('collection', id)[remoteKey]
            ).not.toBe('newRemote');

            expect(
              storageService.getSpace().getRow('collection', id)[localKey]
            ).toBe('newLocal');

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
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
        });

        it('should pull updates on second pull if remote has been updated', async () => {
          const remoteData = [oneDocument('r1'), oneDocument(), oneFolder()];
          await reInitRemoteData(remoteData);
          await syncService.pull(undefined, true);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          let id;
          storageService
            .getSpace()
            .getRowIds('collection')
            .forEach(rowId => {
              if (
                storageService
                  .getSpace()
                  .getCell('collection', rowId, 'title')
                  ?.valueOf() === 'r1'
              ) {
                id = rowId;
              }
            });
          // change remote
          remoteData[0].title = 'new title';
          remoteData[0].updated = Date.now() + 500;
          await reInitRemoteData([remoteData[0], remoteData[1]]);

          // pull again
          await syncService.pull(undefined, true);
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          expect(storageService.getSpace().hasRow('collection', id!));
          expect(
            storageService.getSpace().getCell('collection', id!, 'title')
          ).toBe('new title');
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
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          await syncService.pull(undefined, true);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          expect(
            storageService.getSpace().getRowIds('collection')
          ).toStrictEqual(remoteData.map(r => r.id));

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
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          localChangesService.clearLocalChanges();
          await syncService.pull(undefined, true);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          expect(
            storageService.getSpace().getRowIds('collection')
          ).toStrictEqual(remoteData.map(r => r.id));

          testPushIndicator(false);
        });

        it('should delete local items on pull even if they have been changed after being erased on remote', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          await reInitRemoteData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // update locally
          const id = storageService.getSpace().getRowIds('collection')[0];
          collectionService.setItemTitle(id, 'new title');

          // erase on remote
          await reInitRemoteData([remoteData[1], remoteData[2]]);
          await syncService.pull(undefined, true);
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          expect(collectionService.itemExists(id)).toBeFalsy();
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
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          // erase locally
          const id = storageService.getSpace().getRowIds('collection')[0];
          collectionService.deleteItem(id);

          // pull again
          await syncService.pull(undefined, true);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

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
            expect(storageService.getSpace().getRowCount('collection')).toBe(3);
            // update locally
            const id = storageService.getSpace().getRowIds('collection')[0];
            collectionService.setItemField(
              id,
              field as CollectionItemUpdatableFieldEnum,
              'new'
            );

            // pull again
            await syncService.pull(undefined, true);
            expect(storageService.getSpace().getRowCount('collection')).toBe(3);

            expect(
              storageService
                .getSpace()
                .getCell(
                  'collection',
                  id,
                  field as CollectionItemUpdatableFieldEnum
                )
                ?.valueOf()
            ).not.toBe('new');

            testPushIndicator(false);
          });
        });

        [...NON_PARENT_CHANGES, ...PARENT_CHANGES].forEach(
          ({ local, remote }) => {
            it(`should use server version when localChange=${local} then remoteChange=${remote}`, async () => {
              const localKey = local as CollectionItemUpdatableFieldEnum;
              const remoteKey = remote as CollectionItemUpdatableFieldEnum;
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService.pull();
              const id = storageService.getSpace().getRowIds('collection')[0];

              // change local
              collectionService.setItemField(id, localKey, 'newLocal');

              // change remote
              const idx = remoteData.findIndex(r => r.id === id);
              remoteData[idx][remoteKey] = 'newRemote' as never;
              remoteData[idx].updated = Date.now() + 500;
              await reInitRemoteData(remoteData);

              // pull again
              await syncService.pull(undefined, true);
              expect(storageService.getSpace().getRowCount('collection')).toBe(
                3 // no conflict file was created
              );
              expect(
                storageService.getSpace().getRow('collection', id)[remoteKey]
              ).toBe('newRemote');

              expect(
                storageService.getSpace().getRow('collection', id)[localKey]
              ).not.toBe('newLocal');

              testPushIndicator(false);
            });

            it(`should use server version when remoteChange=${remote} then localChange=${local}`, async () => {
              const localKey = local as CollectionItemUpdatableFieldEnum;
              const remoteKey = remote as CollectionItemUpdatableFieldEnum;
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService.pull();
              const id = storageService.getSpace().getRowIds('collection')[0];

              // change remote
              const idx = remoteData.findIndex(r => r.id === id);
              remoteData[idx][remoteKey] = 'newRemote' as never;
              remoteData[idx].updated = Date.now() - 50;
              await reInitRemoteData(remoteData);

              // change local
              collectionService.setItemField(id, localKey, 'newLocal');

              // pull again
              await syncService.pull(undefined, true);
              expect(storageService.getSpace().getRowCount('collection')).toBe(
                3
              );
              expect(
                storageService.getSpace().getRow('collection', id)[remoteKey]
              ).toBe('newRemote');

              expect(
                storageService.getSpace().getRow('collection', id)[localKey]
              ).not.toBe('newLocal');

              testPushIndicator(false);
            });
          }
        );
      });

      describe('on push operation', () => {
        it('should push nothing on first push if collection is empty', async () => {
          expect(storageService.getSpace().getRowCount('collection')).toBe(0);
          await syncService.push();
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
          expect(remoteContent.content).toHaveLength(0);
        });

        it('should push everything on first push even if there are no local changes', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          localChangesService.clearLocalChanges();

          await syncService.pull();
          await syncService.push();
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
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
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
          expect(remoteContent.content).toHaveLength(3);
        });

        it('should push everything on first push if remote has nothing', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          await syncService.push();
          const remoteContent = inmem.getContent();
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
          const id = storageService.getSpace().getRowIds('collection')[0];

          // delete item locally then push
          collectionService.deleteItem(id);
          await syncService.push();

          // item has been erased
          const remoteContent = await inmem.getContent();
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
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
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
          const remoteContent = await inmem.getContent();
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
            const id = storageService.getSpace().getRowIds('collection')[0];

            // update item locally then push
            collectionService.setItemField(
              id,
              field as CollectionItemUpdatableFieldEnum,
              'newvalue'
            );
            await syncService.push();

            // item has been erased
            const remoteContent = await inmem.getContent();
            expect(remoteContent.content).toHaveLength(3);
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
            const id = storageService.getSpace().getRowIds('collection')[0];

            // change remote
            const idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][field as CollectionItemUpdatableFieldEnum] =
              'newRemote' as never;
            remoteData[idx].updated = Date.now() - 500;
            await reInitRemoteData(remoteData);

            // delete item locally then push
            collectionService.deleteItem(id);
            await syncService.push();

            // item has been erased
            const remoteContent = await inmem.getContent();
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
            const id = storageService.getSpace().getRowIds('collection')[0];

            // delete item locally
            collectionService.deleteItem(id);
            // change remote
            const idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][field as CollectionItemUpdatableFieldEnum] =
              'newRemote' as never;
            remoteData[idx].updated = Date.now() + 500;
            await reInitRemoteData(remoteData);

            await syncService.push();

            // item has been erased
            const remoteContent = await inmem.pullFile(
              InMemProvider.providerfile
            );
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
            let id;
            storageService
              .getSpace()
              .getRowIds('collection')
              .forEach(rowId => {
                if (
                  storageService
                    .getSpace()
                    .getCell('collection', rowId, 'title') === 'r1'
                ) {
                  id = rowId;
                }
              });

            // delete item remotely
            await reInitRemoteData([remoteData[1], remoteData[2]]);
            // update locally
            expect(id).toBeDefined();
            collectionService.setItemField(
              id!,
              field as CollectionItemUpdatableFieldEnum,
              'newvalue'
            );
            // push
            await syncService.push();

            // item has been recreated
            const remoteContent = await inmem.pullFile(
              InMemProvider.providerfile
            );
            expect(remoteContent.content).toHaveLength(3);

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
            const id = storageService.getSpace().getRowIds('collection')[0];
            let idx = remoteData.findIndex(r => r.id === id);
            remoteData[idx][field as CollectionItemUpdatableFieldEnum] =
              'newRemote' as never;
            remoteData[idx].updated = Date.now() + 500;
            await reInitRemoteData(remoteData);

            // push
            await syncService.push();

            // item has not been changed on remote
            const remoteContent = await inmem.getContent();
            idx = remoteContent.content.findIndex(r => r.id === id);
            expect(
              remoteContent.content[idx][
                field as CollectionItemUpdatableFieldEnum
              ]
            ).toBe('newRemote');

            testPushIndicator(false);
          });
        });

        [...NON_PARENT_CHANGES, ...PARENT_CHANGES].forEach(
          ({ local, remote }) => {
            it(`should not push conflicts between ${local} and ${remote}: local wins`, async () => {
              // create a conflict
              const localKey = local as CollectionItemUpdatableFieldEnum;
              const remoteKey = remote as CollectionItemUpdatableFieldEnum;
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService.pull();
              const id = storageService.getSpace().getRowIds('collection')[0];
              collectionService.setItemField(id, localKey, 'newLocal');
              const idx = remoteData.findIndex(r => r.id === id);
              remoteData[idx][remoteKey] = 'newRemote' as never;
              remoteData[idx].updated = Date.now() + 500;
              await reInitRemoteData(remoteData);
              await syncService.pull();
              expect(storageService.getSpace().getRowCount('collection')).toBe(
                4 // a conflict file was created
              );

              // conflict should not be pushed, remote value is kept
              await syncService.push();
              const remoteContent = await inmem.getContent();
              expect(remoteContent.content).toHaveLength(3);
              expect(
                remoteContent.content.find(c => c.id === id)![remoteKey]
              ).toBe('newRemote');
              expect(
                remoteContent.content.find(c => c.id === id)![localKey]
              ).not.toBe('newLocal');
              testPushIndicator(false);
            });

            it(`should update when localChange=${local} then remoteChange=${remote}: local wins`, async () => {
              const localKey = local as CollectionItemUpdatableFieldEnum;
              const remoteKey = remote as CollectionItemUpdatableFieldEnum;
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService.pull();
              const id = storageService.getSpace().getRowIds('collection')[0];
              // change local
              collectionService.setItemField(id, localKey, 'newLocal');
              // change remote
              const idx = remoteData.findIndex(r => r.id === id);
              remoteData[idx][remoteKey] = 'newRemote' as never;
              remoteData[idx].updated = Date.now() + 500;
              await reInitRemoteData(remoteData);
              // push
              await syncService.push();

              await syncService.push();
              const remoteContent = await inmem.getContent();
              expect(remoteContent.content).toHaveLength(3);
              if (remoteKey !== localKey) {
                expect(
                  remoteContent.content.find(c => c.id === id)![remoteKey]
                ).not.toBe('newLocal');
              }
              expect(
                remoteContent.content.find(c => c.id === id)![localKey]
              ).toBe('newLocal');

              testPushIndicator(false);
            });

            it(`should update when remoteChange=${remote} then localChange=${local}: local wins`, async () => {
              const localKey = local as CollectionItemUpdatableFieldEnum;
              const remoteKey = remote as CollectionItemUpdatableFieldEnum;
              const remoteData = [oneDocument(), oneDocument(), oneFolder()];
              await reInitRemoteData(remoteData);
              await syncService.pull();
              const id = storageService.getSpace().getRowIds('collection')[0];
              // change remote
              const idx = remoteData.findIndex(r => r.id === id);
              remoteData[idx][remoteKey] = 'newRemote' as never;
              remoteData[idx].updated = Date.now() - 50;
              await reInitRemoteData(remoteData);
              // change local
              collectionService.setItemField(id, localKey, 'newLocal');

              // push
              await syncService.push();
              const remoteContent = await inmem.getContent();
              expect(remoteContent.content).toHaveLength(3);
              expect(
                remoteContent.content.find(c => c.id === id)![remoteKey]
              ).not.toBe('newRemote');
              expect(
                remoteContent.content.find(c => c.id === id)![localKey]
              ).toBe('newLocal');

              testPushIndicator(false);
            });
          }
        );
      });

      // TODO if server wins, should return 'conflicts' from push op to update push indicator?

      describe('on force-push operation', () => {
        // TODO
        it('should push nothing the first push if collection is empty', async () => {
          expect(storageService.getSpace().getRowCount('collection')).toBe(0);
          await syncService.push(undefined, true);
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
          expect(remoteContent.content).toHaveLength(0);
        });

        // should recreate items deleted on remote and unchanged locally
        // should delete items on remote if present on remote but not pulled locally
        // should update items changed on remote even if unchanged on local (local wins)
      });
    });
  });
});
