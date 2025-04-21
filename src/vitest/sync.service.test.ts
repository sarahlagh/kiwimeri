import { CollectionItem, CollectionItemType } from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
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
const oneDocument = (title = 'new doc', parent = ROOT_FOLDER) => ({
  id: getUniqueId(),
  parent,
  type: CollectionItemType.document,
  title,
  content: 'random',
  created: Date.now(),
  updated: Date.now(),
  deleted: false
});
const oneFolder = (title = 'new folder', parent = ROOT_FOLDER) => ({
  id: getUniqueId(),
  parent,
  type: CollectionItemType.folder,
  title,
  created: Date.now(),
  updated: Date.now(),
  deleted: false
});
const testPushIndicator = (res: boolean) => {
  const { result } = renderHook(() => syncService.usePrimaryHasLocalChanges());
  expect(result.current).toBe(res);
};

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

      describe('pull operation', () => {
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

        it('should pull new remote items without erasing created items', async () => {
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

        it('should pull new remote items several times without erasing created items ', async () => {
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
          remoteData.find(r => r.id === id)!.updated = Date.now() + 50;
          await reInitRemoteData(remoteData);

          // pull again
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

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
          remoteData.find(r => r.id === id)!.updated = Date.now() - 50;
          await reInitRemoteData(remoteData);

          // erase locally
          collectionService.deleteItem(id);

          // pull again
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);

          testPushIndicator(true);
        });

        // TODO: test several pull with deleted changes locally
      });

      // test: should pull remote items (several times) with merging updated items:
      // test: item moved on remote, deleted locally
      // test: deleted locally, item moved on remote
      // test: item title changed on remote, deleted locally
      // test: deleted locally, item title changed on remote
      // test: item moved locally, deleted on remote
      // test: deleted on remote, item moved locally
      // test: item title changed locally, deleted on remote
      // test: deleted on remote, item title changed locally

      // test: one big test with several types of change on remote and local at once

      describe('force-pull operation', () => {
        // TODO
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
      });

      describe('push operation', () => {
        it('should push nothing the first push if collection is empty', async () => {
          expect(storageService.getSpace().getRowCount('collection')).toBe(0);
          await syncService.push();
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
          expect(remoteContent.content).toHaveLength(0);
        });

        it('should push everything on first push if remote has nothing', async () => {
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          await syncService.push();
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
          expect(remoteContent.content).toHaveLength(3);

          testPushIndicator(false);
        });

        it('should delete remote items if they have not been changed and erased locally', async () => {
          // const remoteData = [
          //   oneDocument('r1'),
          //   oneDocument('r2'),
          //   oneFolder('r3')
          // ];
          // initData(remoteData);
          // await syncService.pull();
          // const id = storageService.getSpace().getRowIds('collection')[0];
          // collectionService.deleteItem(id);
        });
      });

      // describe('force-push operation', () => {
      //   // TODO
      // });
    });
  });
});
