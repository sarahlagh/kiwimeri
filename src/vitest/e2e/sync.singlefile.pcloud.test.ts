import { CollectionItem } from '@/collection/collection';
import { unminimizeItemsFromStorage } from '@/collection/compress-collection';
import { appConfig, getGlobalTrans } from '@/config';
import { DEFAULT_NOTEBOOK_ID } from '@/constants';
import { searchService } from '@/db/collection-search.service';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import notebooksService from '@/db/notebooks.service';
import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { SpaceValues } from '@/db/types/space-types';
import userSettingsService from '@/db/user-settings.service';
import { PCloudDriver } from '@/remote-storage/storage-drivers/pcloud/pcloud.driver';
import { SingleFileStorage } from '@/remote-storage/storage-filesystems/singlefile.filesystem';
import { syncService } from '@/remote-storage/sync.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  amount,
  countOrphans,
  getLocalItemConflict,
  getLocalItemConflicts,
  getLocalItemField,
  getNewContent,
  getNewValue,
  getRowCountInsideNotebook,
  oneDocument,
  oneFolder,
  oneNotebook,
  setLocalItemField,
  updateOnRemote
} from '../setup/test.utils';

let notebook: string = DEFAULT_NOTEBOOK_ID;
let driver: PCloudDriver;
let filesystem: SingleFileStorage;

const reInitRemoteData = async (
  items: CollectionItem[],
  updateTs?: number,
  values?: SpaceValues
) => {
  const lastRemoteChange =
    updateTs !== undefined ? updateTs : Math.max(...items.map(i => i.updated));
  if (!values) {
    values = {
      defaultSortBy: 'created',
      defaultSortDesc: false,
      lastUpdated: 0
    };
  }
  console.debug('[reInitRemoteData]', items, values, lastRemoteChange);
  await driver.pushFile(
    'collection.json',
    JSON.stringify({ i: items, u: lastRemoteChange, o: values })
  );
};

const getRemoteContent = async () => {
  expect(storageService.getStore().getRowCount('remoteState')).toBe(1);
  const id = storageService.getStore().getRowIds('remoteState')[0];
  expect(
    storageService.getStore().getCell('remoteState', id, 'info')
  ).toBeDefined();
  const infoStr = storageService
    .getStore()
    .getCell('remoteState', id, 'info')
    ?.valueOf() as string;
  const info = JSON.parse(infoStr!) as { providerid: string };
  const { content } = await driver.pullFile(info.providerid, '');
  console.debug('[getRemoteContent]', content);
  if (!content) {
    return undefined;
  }
  const parsed = JSON.parse(content);
  return {
    items: unminimizeItemsFromStorage(parsed.i as CollectionItem[]),
    values: parsed.o as SpaceValues
  };
};

describe('SimpleStorageProvider with PCloud', { timeout: 10000 }, () => {
  beforeEach(async browser => {
    const browserName =
      browser.task.file.projectName?.match(/e2e \((.*)\)/)?.[1];
    console.debug('browser', browserName);
    remotesService['layer'] = 'singlefile';
    remotesService.addRemote('test', 0, 'pcloud', {
      username: appConfig.PCLOUD_E2E_USERNAME,
      password: appConfig.PCLOUD_E2E_PASSWORD,
      path: `${appConfig.PCLOUD_E2E_PATH}/${browserName}`,
      serverLocation: appConfig.PCLOUD_E2E_SERVER_LOC
    });
    await remotesService.configureRemotes(storageService.getSpaceId(), true);
    expect(remotesService.getRemotes()).toHaveLength(1);
    expect(remotesService.getRemotes()[0].connected).toBeTruthy();
    const keys = remotesService['filesystems'].keys();
    filesystem = remotesService['filesystems'].get(
      keys.next().value!
    )! as SingleFileStorage;
    driver = filesystem!['driver'] as PCloudDriver;

    notebook = notebooksService.getNotebooks()[0].id;
    searchService.initSearchIndices();
  });
  afterEach(async () => {
    console.debug('clearing files');
    await driver.deleteFile('', 'collection.json');
    await driver.deleteFile('', 'S1');
    searchService.stop();
    expect(countOrphans()).toBe(0);
  });

  it('should pull new remote items', async () => {
    const remoteData = [
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3'),
      oneNotebook()
    ];
    await reInitRemoteData(remoteData);
    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(3);

    expect(storageService.getStore().getRowCount('ancestors')).toBeGreaterThan(
      0
    );
  });

  it('should push new local items', async () => {
    collectionService.addDocument(notebook);
    collectionService.addDocument(notebook);
    collectionService.addFolder(notebook);
    expect(getRowCountInsideNotebook()).toBe(3);
    await syncService.push();
    await amount(100);
    const content = await getRemoteContent();
    expect(content?.items).toBeDefined();
    expect(content?.items).toHaveLength(4); // items + notebook
  });

  it('should pull new remote items, create newer, then push', async () => {
    const remoteData = [
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3'),
      oneNotebook()
    ];
    await reInitRemoteData(remoteData);
    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(3);
    collectionService.addFolder(notebook);
    setLocalItemField(remoteData[0].id!, 'title', 'new');
    await syncService.push();
    await amount(100);
    const content = (await getRemoteContent())?.items;
    expect(content).toHaveLength(5); // items + notebook
    expect(content!.map(r => r.title)).toEqual([
      getGlobalTrans().defaultNotebookName,
      'new',
      'r2',
      'r3',
      'New folder'
    ]);
    expect(getRowCountInsideNotebook()).toBe(4);
  });

  it('should pull new remote items and keep local creates between pulls', async () => {
    const remoteData = [
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3'),
      oneNotebook()
    ];
    await reInitRemoteData(remoteData);
    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(3);

    // local, don't push
    collectionService.addFolder(notebook);
    collectionService.addDocument(notebook);

    // pull 1
    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(5);
    expect(getLocalItemConflicts()).toHaveLength(0);

    // pull 2
    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(5);
    expect(getLocalItemConflicts()).toHaveLength(0);

    // update remotely
    await amount(100);
    await reInitRemoteData([...remoteData, oneDocument('r4')]);

    // pull 3
    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(6);
    expect(getLocalItemConflicts()).toHaveLength(0);
  });

  it('should erase existing items if they have been pushed, when changing remote', async () => {
    const remoteData = [
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3'),
      oneNotebook()
    ];
    await reInitRemoteData(remoteData);

    // create local items
    collectionService.addDocument(notebook);
    collectionService.addFolder(notebook);
    expect(getRowCountInsideNotebook()).toBe(2);
    localChangesService.clear(); // clear changes -> it's like they have been pushed somewhere else

    // pull items from new remote
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(3);
  });

  it(`should not delete local items on pull if they have been changed locally before being erased on remote (conflict)`, async () => {
    const remoteData = [
      oneDocument('r1'),
      oneDocument('r2'),
      oneFolder('r3'),
      oneNotebook()
    ];
    await reInitRemoteData(remoteData);

    await amount(100);
    await syncService.pull();
    expect(getRowCountInsideNotebook()).toBe(3);

    // update locally
    await amount(50);
    const id = remoteData[0].id!;
    const newLocalTitle = getNewValue('string');
    setLocalItemField(id, 'title', newLocalTitle);
    await amount(50);

    // erase on remote
    await reInitRemoteData(
      [remoteData[1], remoteData[2], remoteData[3]],
      Date.now()
    );
    await amount(100);
    await syncService.pull();

    // conflict has been created
    expect(getRowCountInsideNotebook()).toBe(3);
    expect(getLocalItemConflicts()).toHaveLength(1);
    expect(collectionService.itemExists(id)).toBeFalsy();
    const conflictId = getLocalItemConflict()!;
    expect(getLocalItemField(conflictId, 'title')).toBe(newLocalTitle);

    // push, no conflict should be pushed
    await amount(100);
    await syncService.push();
    await amount(100);
    let content = (await getRemoteContent())?.items;
    expect(content).toHaveLength(3);
    await amount(100);
    // now, solve conflict
    setLocalItemField(conflictId, 'content', 'new content');
    expect(getLocalItemConflicts()).toHaveLength(0);
    await syncService.push();
    await amount(100);
    content = (await getRemoteContent())?.items;
    expect(content).toHaveLength(4);
  });

  it('should handle different conflicts between local and remote', async () => {
    // create data locally
    const idDocuments = [];
    const idFolders = [];
    let lastParent = notebook;
    notebooksService.addNotebook('n0');
    for (let i = 0; i < 10; i++) {
      idDocuments.push(
        collectionService.addDocument(i % 3 === 0 ? notebook : lastParent)
      );
      lastParent = collectionService.addFolder(
        i % 3 === 0 ? notebook : lastParent
      );
      idFolders.push(lastParent);
    }
    // push
    await syncService.push();
    await amount(100);
    const content = (await getRemoteContent())?.items;
    expect(content).toBeDefined();
    expect(content).toHaveLength(22); // 20 items + 2 notebooks

    const now = Date.now();
    vi.useFakeTimers();
    let lastRemoteChange = now;

    // // modify remote and local

    // update parent locally
    const idUpdateParentLocal = idDocuments[0];
    vi.setSystemTime(now + 5000);
    setLocalItemField(idUpdateParentLocal, 'parent', lastParent);

    // update content locally
    const idUpdateContentLocal = idDocuments[1];
    vi.setSystemTime(now + 6000);
    setLocalItemField(
      idUpdateContentLocal,
      'content',
      getNewContent('newLocalContent')
    );

    // delete remotely
    const idDeleteRemote = idDocuments[2];
    vi.setSystemTime(now + 7000);
    const idx = content!.findIndex(c => c.id === idDeleteRemote);
    expect(idx).not.toBe(-1);
    content!.splice(idx, 1);
    lastRemoteChange = Date.now();

    // update content remotely on same as local
    vi.setSystemTime(now + 8000);
    updateOnRemote(
      content!,
      idUpdateContentLocal,
      'content',
      getNewContent('newRemoteContent')
    );
    lastRemoteChange = Date.now();

    // update title remotely on same as local
    const idUpdateTitleLocal = idFolders[0];
    vi.setSystemTime(now + 9000);
    updateOnRemote(content!, idUpdateTitleLocal, 'title', 'newRemoteTitle');
    lastRemoteChange = Date.now();

    // update parent remotely on different id
    const idUpdateParentRemote = idFolders[1];
    vi.setSystemTime(now + 10000);
    updateOnRemote(
      content!,
      idUpdateParentRemote,
      'content',
      getNewContent('newRemoteContent')
    );
    lastRemoteChange = Date.now();

    // create remotely
    vi.setSystemTime(now + 11000);
    const newRemoteItem = oneFolder('r100');
    content!.push(newRemoteItem);
    lastRemoteChange = Date.now();

    // create locally
    vi.setSystemTime(now + 12000);
    const newLocalItem = collectionService.addDocument(notebook);

    // update title remotely on different id as local
    const idUpdateTitleRemote = idFolders[2];
    vi.setSystemTime(now + 13000);
    updateOnRemote(content!, idUpdateTitleRemote, 'title', 'newRemoteTitle');
    lastRemoteChange = Date.now();

    // update content remotely on different id as local
    const idUpdateContentRemote = idDocuments[3];
    vi.setSystemTime(now + 14000);
    updateOnRemote(
      content!,
      idUpdateContentRemote,
      'content',
      getNewContent('newRemoteContent')
    );
    lastRemoteChange = Date.now();

    // update content locally on merge id
    const idUpdateTitleMerge = idDocuments[4];
    vi.setSystemTime(now + 15000);
    setLocalItemField(
      idUpdateTitleMerge,
      'content',
      getNewContent('newLocalContent')
    );

    // // update title remotely on merge id
    vi.setSystemTime(now + 16000);
    updateOnRemote(content!, idUpdateTitleMerge, 'title', 'newRemoteTitle');
    lastRemoteChange = Date.now();

    // update title locally
    vi.setSystemTime(now + 17000);
    setLocalItemField(idUpdateTitleLocal, 'title', 'newLocalTitle');

    // delete locally
    const idDeleteLocal = idDocuments[5];
    vi.setSystemTime(now + 18000);
    collectionService.deleteItem(idDeleteLocal);

    // update parent remotely on same as local
    vi.setSystemTime(now + 19000);
    updateOnRemote(content!, idUpdateParentLocal, 'parent', newRemoteItem.id!);
    lastRemoteChange = Date.now();

    // update remote
    vi.useRealTimers();
    await reInitRemoteData(content!, lastRemoteChange);

    // pull
    await syncService.pull();

    // now check
    expect(getRowCountInsideNotebook()).toBe(22); // 20 + 2 added -2 deleted + 2 conflicts
    expect(notebooksService.getNotebooks()).toHaveLength(2);

    // check items created are still there
    expect(collectionService.itemExists(newLocalItem));
    expect(collectionService.itemExists(newRemoteItem.id!));

    // check deleted items
    expect(collectionService.itemExists(idDeleteLocal)).toBeFalsy(); // has been deleted locally
    expect(collectionService.itemExists(idDeleteRemote)).toBeFalsy(); // has been deleted from remote

    // check updated items
    expect(getLocalItemField(idUpdateTitleLocal, 'title')).toBe(
      'newLocalTitle'
    );
    expect(getLocalItemField(idUpdateContentLocal, 'content')).toBe(
      getNewContent('newRemoteContent')
    );
    expect(getLocalItemField(idUpdateParentLocal, 'parent')).toBe(
      newRemoteItem.id
    );

    expect(getLocalItemField(idUpdateTitleMerge, 'title')).toBe(
      'newRemoteTitle'
    );
    expect(getLocalItemField(idUpdateTitleMerge, 'content')).toBe(
      getNewContent('newLocalContent')
    );

    // check conflicts
    const conflictIds = getLocalItemConflicts();
    expect(conflictIds).toHaveLength(2);
    expect(getLocalItemField(conflictIds[0], 'conflict')).toBe(
      idUpdateContentLocal
    );
    expect(getLocalItemField(conflictIds[1], 'conflict')).toBe(
      idUpdateParentLocal
    );
  });

  it('should handle reinit on network down', async () => {
    // create local item, don't sync
    collectionService.addDocument(DEFAULT_NOTEBOOK_ID);
    // create item on remote, sync
    await reInitRemoteData([oneDocument('remote')]);
    // reinit sync after network down
    await remotesService.configureRemotes(storageService.getSpaceId());
    // now pull
    await syncService.pull();
    // both items are kept
    expect(getRowCountInsideNotebook()).toBe(2);
  });

  describe(`tests with values`, () => {
    it(`should pull updated values`, async () => {
      await reInitRemoteData([oneNotebook()], Date.now(), {
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: Date.now()
      });

      expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
        sort: {
          by: 'created',
          descending: false
        }
      });

      await syncService.pull();

      expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
        sort: {
          by: 'order',
          descending: true
        }
      });
    });

    it(`should not pull remote values if local changed`, async () => {
      const remoteTs = Date.now() - 500;
      await reInitRemoteData([oneNotebook()], remoteTs, {
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: remoteTs
      });

      userSettingsService.setSpaceDefaultDisplayOpts({
        sort: {
          by: 'updated',
          descending: false
        }
      });

      await syncService.pull();

      expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
        sort: {
          by: 'updated',
          descending: false
        }
      });
    });

    it(`should force pull remote values even if local changed`, async () => {
      const remoteTs = Date.now() - 500;
      await reInitRemoteData([oneNotebook()], remoteTs, {
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: remoteTs
      });

      userSettingsService.setSpaceDefaultDisplayOpts({
        sort: {
          by: 'updated',
          descending: false
        }
      });

      await syncService.pull(undefined, true);

      expect(userSettingsService.getSpaceDefaultDisplayOpts()).toEqual({
        sort: {
          by: 'order',
          descending: true
        }
      });
    });

    it(`should push updated values`, async () => {
      const remoteTs = Date.now() - 500;
      await reInitRemoteData([oneNotebook()], remoteTs, {
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: remoteTs
      });

      userSettingsService.setSpaceDefaultDisplayOpts({
        sort: {
          by: 'updated',
          descending: false
        }
      });
      await syncService.push();

      const remoteContent = await getRemoteContent();
      expect(remoteContent?.values).toEqual({
        defaultSortBy: 'updated',
        defaultSortDesc: false,
        lastUpdated: storageService.getSpace().getValue('lastUpdated')
      });
    });

    it(`should not push remote values if remote changed`, async () => {
      userSettingsService.setSpaceDefaultDisplayOpts({
        sort: {
          by: 'updated',
          descending: false
        }
      });

      const pushTime = Date.now() + 500;
      await reInitRemoteData([oneNotebook()], pushTime, {
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: pushTime
      });

      await syncService.push();

      const remoteContent = await getRemoteContent();
      expect(remoteContent?.values).toEqual({
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: pushTime
      });
    });

    it(`should force push remote values even if remote changed`, async () => {
      userSettingsService.setSpaceDefaultDisplayOpts({
        sort: {
          by: 'updated',
          descending: false
        }
      });

      await reInitRemoteData([oneNotebook()], Date.now() + 500, {
        defaultSortBy: 'order',
        defaultSortDesc: true,
        lastUpdated: Date.now() + 500
      });

      await syncService.push(undefined, true);

      const remoteContent = await getRemoteContent();
      expect(remoteContent?.values).toEqual({
        defaultSortBy: 'updated',
        defaultSortDesc: false,
        lastUpdated: storageService.getSpace().getValue('lastUpdated')
      });
    });
  });
});
