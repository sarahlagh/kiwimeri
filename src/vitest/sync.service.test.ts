import {
  CollectionItem,
  CollectionItemType,
  CollectionItemTypeValues
} from '@/collection/collection';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { InMemProvider } from '@/storage-providers/inmem.provider';
import { LayerTypes } from '@/storage-providers/storage-layer.factory';
import { syncService } from '@/storage-providers/sync.service';
import { renderHook } from '@testing-library/react';
import { getUniqueId } from 'tinybase/with-schemas';
import { beforeEach, describe, expect, it } from 'vitest';

const inmem = new InMemProvider();
const initData = (items: CollectionItem[]) => {
  inmem.pushFile(InMemProvider.providerfile, JSON.stringify(items));
};
const oneItem = (
  type: CollectionItemTypeValues = CollectionItemType.document,
  parent = ROOT_FOLDER
) => ({
  id: getUniqueId(),
  parent,
  type,
  title: 'random',
  content: 'random',
  created: Date.now(),
  updated: Date.now(),
  deleted: false
});

describe('sync service', () => {
  [{ layer: 'simple' }, { layer: 'bucket' }].forEach(({ layer }) => {
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

      it('should do nothing on first pull if remote has nothing', async () => {
        await syncService.pull();
        storageService.getSpace().getRowCount('collection');
        expect(storageService.getSpace().getRowCount('collection')).toBe(0);
      });

      it('should do pull everything on first pull if remote has content', async () => {
        initData([oneItem(), oneItem(), oneItem('f')]);
        await syncService.pull();
        expect(storageService.getSpace().getRowCount('collection')).toBe(3);
      });

      it('should push nothing the first push if collection is empty', async () => {
        await syncService.push();
        const remoteContent = await inmem.pullFile(InMemProvider.providerfile);
        expect(remoteContent.content).toHaveLength(0);
      });

      it('should push everything on first push if remote has nothing', async () => {
        collectionService.addDocument(ROOT_FOLDER);
        collectionService.addDocument(ROOT_FOLDER);
        collectionService.addFolder(ROOT_FOLDER);
        await syncService.push();
        const remoteContent = await inmem.pullFile(InMemProvider.providerfile);
        expect(remoteContent.content).toHaveLength(3);
      });

      // it('should add new local items on push if remote has content', async () => {
      //   initData([oneItem(), oneItem(), oneItem('f')]);
      //   collectionService.addFolder(ROOT_FOLDER);
      //   await syncService.push();
      //   const remoteContent = await inmem.pullFile(InMemProvider.providerfile);
      //   expect(remoteContent.content).toHaveLength(4);
      // });
    });
  });

  // test: first push, remote has content
  // test: second pull, no local changes, remote hasn't changed
  // test: second pull, no local changes, remote has changed
  // test: second pull, with local changes, remote hasn't changed
  // test: second pull, with local changes, remote has changed
  // test: no local changes, push is disabled
  // test: local changes, push is enabled
  // test: local changes, push, remote hasn't changed
  // test: local changes, push, remote has changed
});
