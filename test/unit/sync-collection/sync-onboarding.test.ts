import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { InMemDriver } from '@/remote-storage/storage-drivers/inmem.driver';
import { CompositeSynchronizer } from '@/remote-storage/synchronizers/composite-synchronizer';
import { beforeEach, describe, test, vi } from 'vitest';
import { adv } from '../../_setup/test.utils';
import { syncService_sync } from './test-sync.utils';

describe(`sync onboarding test`, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("after adding a first remote, if the remote location doesn't exist, sync should work", async () => {
    remotesService.addRemote('test', 0, 'inmem', {
      names: ['newcollection.json']
    });
    await remotesService.configureRemotes(storageService.getSpaceId(), true);

    const { success, didPull, didPush } = await syncService_sync('sync');
    expect(success);
    expect(!didPull);
    expect(didPush);
  });

  test('after adding a first remote, if the remote location already exists, pull should work', async () => {
    const driver = new InMemDriver();
    driver.pushFile({ filename: 'newcollection.json' }, '');

    // add remote after
    adv(() =>
      remotesService.addRemote('test', 0, 'inmem', {
        names: ['newcollection.json']
      })
    );
    await remotesService.configureRemotes(storageService.getSpaceId(), true);

    // for test, replace driver
    const compositeSynchronizer = remotesService['synchronizers']
      .values()
      .next().value! as CompositeSynchronizer;
    compositeSynchronizer['statsEnabled'] = false;
    compositeSynchronizer['collectionSynchronizer']['driver'] = driver;

    const { success, didPull, didPush } = await syncService_sync('sync');
    expect(success);
    expect(!didPull); // should fail
    expect(didPush);

    driver.close();
  });
});
