import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { inject } from 'vitest';

describe('sync service', () => {
  beforeEach(async () => {
    remotesService.addRemote('test', 0, 'inmem');
    await remotesService.initSyncConnection(storageService.getSpaceId(), true);
  });

  it('should detect if primary remote is connected', async () => {
    expect(inject('ok')).toBeTruthy();
    // const context = inject('tinybaseContext');
    // expect(context).toBeDefined();
    // expect(syncService.usePrimaryConnected()).toBeTruthy();
  });
  // test: first pull, remote has nothing
  // test: first pull, remote has content
  // test: first push, remote has nothing
  // test: first push, remote has content
  // test: second pull, no local changes, remote hasn't changed
  // test: second pull, no local changes, remote has changed
  // test: second pull, with local changes, remote hasn't changed
  // test: second pull, with local changes, remote has changed
  // test: no local changes, push is disabled
  // test: local changes, push is enable
  // test: local changes, push, remote hasn't changed
  // test: local changes, push, remote has changed
});
