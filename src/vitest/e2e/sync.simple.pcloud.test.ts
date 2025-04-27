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
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCollectionRowCount,
  oneDocument,
  oneFolder
} from '../setup/test.utils';

let driver: PCloudDriver;
let provider: SimpleStorageProvider;

const reInitRemoteData = async (items: CollectionItem[], firstTime = false) => {
  await driver.pushFile('collection.json', JSON.stringify(items));
  if (firstTime) {
    await remotesService.initSyncConnection(storageService.getSpaceId(), true);
  }
};

const getRemoteContent = async () => {
  const { content } = await driver.pullFile(
    provider['localInfo'].providerid,
    ''
  );
  return content ? (JSON.parse(content) as CollectionItem[]) : undefined;
};

describe('SimpleStorageProvider with PCloud', () => {
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
    await reInitRemoteData(remoteData, true);
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
    await reInitRemoteData(remoteData, true);

    // create local items
    collectionService.addDocument(ROOT_FOLDER);
    collectionService.addFolder(ROOT_FOLDER);
    expect(getCollectionRowCount()).toBe(2);
    localChangesService.clearLocalChanges(); // clear changes -> it's like they have been pushed

    // pull items from new remote
    await syncService.pull();
    expect(getCollectionRowCount()).toBe(3);
  });
});
