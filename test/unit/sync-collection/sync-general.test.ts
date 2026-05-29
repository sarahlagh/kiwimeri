import { CollectionItemType } from '@/collection/collection';
import {
  DEFAULT_NOTEBOOK_ID,
  DEFAULT_SPACE_ID,
  getGlobalTrans
} from '@/constants';
import { space } from '@/core/db/store';
import { historyService } from '@/db/collection-history.service';
import collectionService from '@/db/collection.service';
import remotesService from '@/db/remotes.service';
import { conflictsService } from '@/domain/conflicts/conflicts-service';
import localChangesService from '@/domain/local-changes/local-changes.service';
import { LocalChangeType } from '@/domain/local-changes/model';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { SingleFileStorage } from '@/remote-storage/storage-filesystems/singlefile.filesystem';
import { syncService } from '@/remote-storage/sync.service';
import {
  adv,
  getRowCountInsideNotebook,
  oneDocument,
  oneFolder,
  oneNotebook,
  wrappedRenderHook
} from '@@/_setup/test.utils';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getRemoteContent,
  reInitRemoteData,
  syncService_sync,
  testSyncAfterEach,
  testSyncBeforeEach
} from './test-sync.utils';

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

describe(`sync general test`, () => {
  beforeEach(testSyncBeforeEach);
  afterEach(testSyncAfterEach);

  it('should do nothing on first pull if remote has nothing', async () => {
    const resp = await syncService_sync('sync');
    expect(resp.success);
    expect(!resp.didPull);
    expect(!resp.didPush);
    expect(getRowCountInsideNotebook()).toBe(0);
    expect(space.getRowCount('history')).toBe(0);
  });

  it('should pull everything on first pull if remote has content', async () => {
    await reInitRemoteData([
      oneDocument(),
      oneDocument(),
      oneFolder(),
      oneNotebook()
    ]);
    const resp = await syncService_sync('sync');
    expect(resp.success);
    expect(resp.didPull);
    expect(!resp.didPush);
    expect(getRowCountInsideNotebook()).toBe(3);
    checkHistory(2);
  });

  it('should pull new remote items, create newer, then push', async () => {
    const remoteData = [
      oneNotebook('n0'),
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3')
    ];
    await reInitRemoteData(remoteData);

    const resp1 = await syncService_sync('sync');
    expect(resp1.success);
    expect(resp1.didPull);
    expect(!resp1.didPush);

    expect(getRowCountInsideNotebook()).toBe(3);
    adv(() => collectionService.addFolder(DEFAULT_NOTEBOOK_ID));

    const resp2 = await syncService_sync('sync');
    expect(resp2.success);
    expect(!resp2.didPull);
    expect(resp2.didPush);

    const remoteContent = await getRemoteContent();
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
    checkHistory(2);
  });

  it('should handle reinit on network down', async () => {
    // create local item, don't sync
    adv(() => collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    // create item on remote, sync
    await reInitRemoteData([oneDocument('remote')]);
    // reinit sync after network down
    await remotesService.configureRemotes(DEFAULT_SPACE_ID);
    // now pull
    const resp = await syncService_sync('sync');
    expect(resp.success);
    expect(resp.didPull);
    expect(resp.didPush);
    // both items are kept
    expect(getRowCountInsideNotebook()).toBe(2);
  });

  it('should prevent sync when there are conflicts', async () => {
    conflictsService.initConflictQueries();
    // create local item
    const id = adv(() => collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    // artificially create a conflict
    adv(() => space.setCell('collection', id, 'conflict', 'fakeId'));
    // is global sync prevented
    const { result, unmount } = wrappedRenderHook(() =>
      syncService.useIsMergeSyncEnabled()
    );
    expect(result.current).toBe(false);
    unmount();
    // calling the method won't succeed on push
    const { success, didPull, didPush } = await syncService.sync('sync');
    expect(success);
    expect(didPull);
    expect(!didPush);
    conflictsService.closeConflictQueries();
  });

  it('should prevent force push when there are conflicts', async () => {
    // create local item
    const id = adv(() => collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    // artificially create a conflict
    adv(() => space.setCell('collection', id, 'conflict', 'fakeId'));
    // calling the method won't succeed on push
    const { success, didPush } = await syncService.sync('force-push');
    expect(success);
    expect(!didPush);
  });

  it('should erase conflicts on force pull', async () => {
    // create local item
    const id = adv(() => collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    await syncService.push();

    // artificially create a conflict
    adv(() => space.setCell('collection', id, 'conflict', 'fakeId'));
    expect(collectionService.isItemConflict(id));
    // calling the method will overwrite
    const { success, didPull } = await syncService.sync('force-pull');
    expect(success);
    expect(didPull);

    expect(!collectionService.isItemConflict(id));
  });

  it('should allow sync once all conflicts are solved', async () => {
    conflictsService.initConflictQueries();
    // create local item
    const id = adv(() => collectionService.addDocument(DEFAULT_NOTEBOOK_ID));
    await syncService.push();

    // artificially create a conflict
    adv(() => space.setCell('collection', id, 'conflict', 'fakeId'));
    expect(collectionService.isItemConflict(id));

    {
      const { result, unmount } = wrappedRenderHook(() =>
        syncService.useIsMergeSyncEnabled()
      );
      expect(result.current).toBe(false);
      unmount();
    }

    // solve conflict
    adv(() => collectionService.setItemTitle(id, 'test'));
    expect(!collectionService.isItemConflict(id));
    const lc = localChangesService
      .getLocalChanges()
      .find(lc => lc.itemId === id);
    expect(lc?.change).toBe(LocalChangeType.add);
    expect(lc?.itemId).toBe(id);

    {
      const { result, unmount } = renderHook(() =>
        syncService.useIsMergeSyncEnabled()
      );
      expect(result.current).toBe(true);
      unmount();
    }

    conflictsService.closeConflictQueries();
  });
});

describe(`filesystem test`, () => {
  it(`should handle aborted push`, async () => {
    const driver = new InMemDriver();
    const filesystem = new SingleFileStorage('test', driver, {
      filename: 'test.json'
    });
    filesystem.configureDriver({ failOnPush: true });
    const { success, didPush } = await filesystem.acceptsChanges({
      test: 'ok'
    });
    expect([...driver['collection'].keys()].some(k => k.endsWith('.part')));
    expect(!success);
    expect(didPush);
  });
});
