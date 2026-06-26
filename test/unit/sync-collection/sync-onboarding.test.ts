import { DEFAULT_SPACE_ID } from '@/constants';
import remotesService from '@/domain/remotes/remotes.service';
import { CompositeSynchronizer } from '@/domain/replication/merging/synchronizers/composite-synchronizer';
import { InMemDriver } from '@@/_setup/inmem.driver';
import { adv } from '@@/_setup/test.utils';
import { beforeEach, describe, test, vi } from 'vitest';
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
    await remotesService.configureRemotes(DEFAULT_SPACE_ID, true);

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
    await remotesService.configureRemotes(DEFAULT_SPACE_ID, true);

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
