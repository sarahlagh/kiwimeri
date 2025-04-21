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
const initData = (items: CollectionItem[]) => {
  inmem.pushFile(InMemProvider.providerfile, JSON.stringify(items));
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

      /////////////////////////////////////////////// pull

      describe('pull operation', () => {
        it('should do nothing on first pull if remote has nothing', async () => {
          await syncService.pull();
          storageService.getSpace().getRowCount('collection');
          expect(storageService.getSpace().getRowCount('collection')).toBe(0);
        });

        it('should do pull everything on first pull if remote has content', async () => {
          initData([oneDocument(), oneDocument(), oneFolder()]);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
        });

        it('should pull new remote items, create newer, then push', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          initData(remoteData);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(3);
          collectionService.addFolder(ROOT_FOLDER);
          await syncService.push();
          const remoteContent = await inmem.pullFile(
            InMemProvider.providerfile
          );
          expect(remoteContent.content).toHaveLength(4);
          expect(remoteContent.content.map(r => r.title)).toEqual([
            'r1',
            'r2',
            'r3',
            'New folder'
          ]);
          expect(storageService.getSpace().getRowCount('collection')).toBe(4);
        });

        it('should pull new remote items without erasing created items', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          initData(remoteData);
          // create local items
          collectionService.addDocument(ROOT_FOLDER);
          collectionService.addFolder(ROOT_FOLDER);
          expect(storageService.getSpace().getRowCount('collection')).toBe(2);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(5);

          // indicator should still tell if push allowed
          const { result } = renderHook(() =>
            syncService.usePrimaryHasLocalChanges()
          );
          expect(result.current).toBeTruthy();
        });

        it('should pull new remote items several times without erasing created items ', async () => {
          const remoteData = [
            oneDocument('r1'),
            oneDocument('r2'),
            oneFolder('r3')
          ];
          initData(remoteData);
          // create local items
          collectionService.addDocument(ROOT_FOLDER);
          expect(storageService.getSpace().getRowCount('collection')).toBe(1);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(4);

          // update remote again
          initData([...remoteData, oneDocument('r4')]);
          await syncService.pull();
          expect(storageService.getSpace().getRowCount('collection')).toBe(5);

          // indicator should still tell if push allowed
          const { result } = renderHook(() =>
            syncService.usePrimaryHasLocalChanges()
          );
          expect(result.current).toBeTruthy();
        });
      });

      // test: should pull remote items (several times) with merging updated items
      // test: should pull remote items (several times) without recreating deleted local items (if remotes haven't changed)
      // test: should pull remote items (several times) by recreating deleted local items (if remote have changed)

      /////////////////////////////////////////////// push

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

          // indicator should still tell if push allowed
          const { result } = renderHook(() =>
            syncService.usePrimaryHasLocalChanges()
          );
          expect(result.current).toBeFalsy();
        });
      });
    });
  });
});
