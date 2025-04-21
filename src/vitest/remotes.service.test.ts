import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';

describe('remotes service', () => {
  it('should add a remote in db without testing connection', () => {
    remotesService.addRemote('test', 0, 'inmem');
    expect(storageService.getStore().getRowCount('remotes')).toBe(1);
    const rowId = storageService.getStore().getRowIds('remotes')[0];
    const row = storageService.getStore().getRow('remotes', rowId);
    expect(row.name).toBe('test');
    expect(row.rank).toBe(0);
    expect(row.type).toBe('inmem');
    const state = row.state;
    expect(
      storageService.getStore().hasRow('remoteState', state as string)
    ).toBeTruthy();
    const stateRow = storageService
      .getStore()
      .getRow('remoteState', state as string);
    expect(stateRow.connected).toBeFalsy();
    expect(stateRow.lastRemoteChange).toBeDefined();
  });

  it('should not init sync for previously unconfigured remotes', async () => {
    remotesService.addRemote('test', 0, 'inmem');
    await remotesService.initSyncConnection(storageService.getSpaceId());
    const rowId = storageService.getStore().getRowIds('remotes')[0];
    const state = storageService.getStore().getRow('remotes', rowId).state;
    const stateRow = storageService
      .getStore()
      .getRow('remoteState', state as string);
    expect(stateRow.connected).toBeFalsy();
    expect(remotesService.getPersister(rowId)).toBeUndefined();
  });

  it('should only init sync for previously configured remotes', async () => {
    remotesService.addRemote('test', 0, 'inmem');
    const rowId = storageService.getStore().getRowIds('remotes')[0];
    const state = storageService.getStore().getRow('remotes', rowId)
      .state as string;
    const ok = await remotesService.configure(
      {
        id: rowId,
        state,
        type: 'inmem',
        config: '{}',
        connected: false,
        formats: '',
        name: 'test',
        rank: 0
      },
      {}
    );
    expect(ok).toBeTruthy();
    await remotesService.initSyncConnection(storageService.getSpaceId());
    const stateRow = storageService
      .getStore()
      .getRow('remoteState', state as string);
    expect(stateRow.connected).toBeTruthy();
    expect(remotesService.getPersister(rowId)).toBeDefined();
  });

  it('should only init sync for all remotes on demand', async () => {
    remotesService.addRemote('test', 0, 'inmem');
    await remotesService.initSyncConnection(storageService.getSpaceId(), true);
    const rowId = storageService.getStore().getRowIds('remotes')[0];
    const state = storageService.getStore().getRow('remotes', rowId).state;
    const stateRow = storageService
      .getStore()
      .getRow('remoteState', state as string);
    expect(stateRow.connected).toBeTruthy();
    expect(remotesService.getPersister(rowId)).toBeDefined();
  });
});
