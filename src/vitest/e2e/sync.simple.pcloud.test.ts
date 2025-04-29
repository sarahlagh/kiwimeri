import { CollectionItem } from '@/collection/collection';
import { appConfig } from '@/config';
import { ROOT_FOLDER } from '@/constants';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/localChanges.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { PCloudDriver } from '@/remote-storage/storage-drivers/pcloud/pcloud.driver';
import { SimpleStorageProvider } from '@/remote-storage/storage-providers/simple.provider';
import { syncService } from '@/remote-storage/sync.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCollectionRowCount,
  getLocalItemConflicts,
  getLocalItemField,
  oneDocument,
  oneFolder,
  setLocalItemField,
  updateOnRemote
} from '../setup/test.utils';

let driver: PCloudDriver;
let provider: SimpleStorageProvider;

const reInitRemoteData = async (items: CollectionItem[]) => {
  console.debug('[reInitRemoteData]', items);
  await driver.pushFile('collection.json', JSON.stringify(items));
};

const getRemoteContent = async () => {
  const { content } = await driver.pullFile(
    provider['localInfo'].providerid,
    ''
  );
  console.debug('[getRemoteContent]', content);
  return content ? (JSON.parse(content) as CollectionItem[]) : undefined;
};

describe('SimpleStorageProvider with PCloud', { timeout: 10000 }, () => {
  beforeEach(async () => {
    remotesService['layer'] = 'simple';
    remotesService.addRemote('test', 0, 'pcloud', {
      username: appConfig.PCLOUD_E2E_USERNAME,
      password: appConfig.PCLOUD_E2E_PASSWORD,
      path: appConfig.PCLOUD_E2E_PATH,
      serverLocation: appConfig.PCLOUD_E2E_SERVER_LOC
    });
    await remotesService.initSyncConnection(storageService.getSpaceId(), true);
    expect(remotesService.getRemotes()).toHaveLength(1);
    expect(remotesService.getRemotes()[0].connected).toBeTruthy();
    const keys = remotesService['providers'].keys();
    provider = remotesService['providers'].get(
      keys.next().value!
    )! as SimpleStorageProvider;
    driver = provider!['driver'] as PCloudDriver;
  });
  afterEach(async () => {
    console.debug('clearing files');
    await driver.deleteFile('', 'collection.json');
    await driver.deleteFile('', 'S1');
  });

  it('should pull new remote items', async () => {
    const remoteData = [oneDocument('r1'), oneDocument('r2'), oneFolder('r3')];
    await reInitRemoteData(remoteData);
    await syncService.pull();
    expect(getCollectionRowCount()).toBe(3);
  });

  it('should push new local items', async () => {
    collectionService.addDocument(ROOT_FOLDER);
    collectionService.addDocument(ROOT_FOLDER);
    collectionService.addFolder(ROOT_FOLDER);
    expect(getCollectionRowCount()).toBe(3);
    await syncService.push();
    const content = await getRemoteContent();
    expect(content).toBeDefined();
    expect(content).toHaveLength(3);
  });

  it('should erase existing items if they have been pushed, when changing remote', async () => {
    const remoteData = [oneDocument('r1'), oneDocument('r2'), oneFolder('r3')];
    await reInitRemoteData(remoteData);

    // create local items
    collectionService.addDocument(ROOT_FOLDER);
    collectionService.addFolder(ROOT_FOLDER);
    expect(getCollectionRowCount()).toBe(2);
    localChangesService.clearLocalChanges(); // clear changes -> it's like they have been pushed

    // pull items from new remote
    await syncService.pull();
    expect(getCollectionRowCount()).toBe(3);
  });

  it('should handle different conflicts between local and remote', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    // create data locally
    const ids = [];
    let lastParent = ROOT_FOLDER;
    for (let i = 0; i < 10; i++) {
      ids.push(
        collectionService.addDocument(i % 3 === 0 ? ROOT_FOLDER : lastParent)
      );
      lastParent = collectionService.addFolder(
        i % 3 === 0 ? ROOT_FOLDER : lastParent
      );
      ids.push(lastParent);
    }
    // push
    await syncService.push();
    const content = await getRemoteContent();
    expect(content).toBeDefined();
    expect(content).toHaveLength(20);

    // // modify remote and local

    // update parent locally
    const idUpdateParentLocal = ids[0];
    vi.setSystemTime(now + 5000);
    setLocalItemField(idUpdateParentLocal, 'parent', lastParent);

    // update content locally
    const idUpdateContentLocal = ids[1];
    vi.setSystemTime(now + 6000);
    setLocalItemField(idUpdateContentLocal, 'content', 'newLocalContent');

    // delete remotely
    const idDeleteRemote = ids[2];
    vi.setSystemTime(now + 7000);
    const idx = content!.findIndex(c => c.id === idDeleteRemote);
    expect(idx).not.toBe(-1);
    content!.splice(idx, 1);

    // update content remotely on same as local
    vi.setSystemTime(now + 8000);
    updateOnRemote(
      content!,
      idUpdateContentLocal,
      'content',
      'newRemoteContent'
    );

    // update title locally
    const idUpdateTitleLocal = ids[3];
    vi.setSystemTime(now + 9000);
    setLocalItemField(idUpdateTitleLocal, 'title', 'newLocalTitle');

    // update parent remotely on different id
    const idUpdateParentRemote = ids[4];
    vi.setSystemTime(now + 10000);
    updateOnRemote(
      content!,
      idUpdateParentRemote,
      'content',
      'newRemoteContent'
    );

    // create remotely
    vi.setSystemTime(now + 11000);
    const newRemoteItem = oneFolder('r100');
    content!.push(newRemoteItem);

    // create locally
    vi.setSystemTime(now + 12000);
    const newLocalItem = collectionService.addDocument(ROOT_FOLDER);

    // update title remotely on different id as local
    const idUpdateTitleRemote = ids[5];
    vi.setSystemTime(now + 13000);
    updateOnRemote(content!, idUpdateTitleRemote, 'title', 'newRemoteTitle');

    // update content remotely on different id as local
    const idUpdateContentRemote = ids[6];
    vi.setSystemTime(now + 14000);
    updateOnRemote(
      content!,
      idUpdateContentRemote,
      'content',
      'newRemoteContent'
    );

    // update title remotely on same as local
    vi.setSystemTime(now + 14000);
    updateOnRemote(content!, idUpdateTitleLocal, 'title', 'newRemoteTitle');

    // delete locally
    const idDeleteLocal = ids[8];
    vi.setSystemTime(now + 15000);
    collectionService.deleteItem(idDeleteLocal);

    // update parent remotely on same as local
    vi.setSystemTime(now + 16000);
    updateOnRemote(content!, idUpdateParentLocal, 'parent', newRemoteItem.id);

    // update remote
    vi.useRealTimers();
    await reInitRemoteData(content!);

    // pull
    await syncService.pull();

    // now check
    expect(getCollectionRowCount()).toBe(22);

    // check items created are still there
    expect(collectionService.itemExists(newLocalItem));
    expect(collectionService.itemExists(newRemoteItem.id!));

    // check deleted items
    expect(collectionService.itemExists(idDeleteLocal)).toBeFalsy(); // has been deleted locally
    expect(collectionService.itemExists(idDeleteRemote)).toBeFalsy(); // has been deleted from remote

    // check updated items
    expect(getLocalItemField(idUpdateTitleLocal, 'title')).not.toBe(
      'newLocalTitle'
    );
    expect(getLocalItemField(idUpdateContentLocal, 'content')).toBe(
      'newRemoteContent'
    );
    expect(getLocalItemField(idUpdateParentLocal, 'parent')).toBe(lastParent);

    // check conflicts
    const conflictIds = getLocalItemConflicts();
    expect(conflictIds).toHaveLength(2);
    expect(getLocalItemField(conflictIds[0], 'conflict')).toBe(
      idUpdateTitleLocal
    );
    expect(getLocalItemField(conflictIds[1], 'conflict')).toBe(
      idUpdateContentLocal
    );
  });
});
