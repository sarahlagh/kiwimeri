import remotesService from '@/db/remotes.service';
import storageService from '@/db/storage.service';
import { renderHook } from '@testing-library/react';

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

  it('should sort remotes by rank', async () => {
    remotesService.addRemote('test3', 3, 'inmem');
    remotesService.addRemote('test2', 2, 'inmem');
    remotesService.addRemote('test0', 0, 'inmem');
    remotesService.addRemote('test4', 4, 'inmem');
    remotesService.addRemote('test1', 1, 'inmem');

    const { result } = renderHook(() => remotesService.useRemotes());
    expect(result.current).toHaveLength(5);
    expect(result.current.map(r => r.rank)).toStrictEqual([0, 1, 2, 3, 4]);
    expect(result.current.map(r => r.name)).toStrictEqual([
      'test0',
      'test1',
      'test2',
      'test3',
      'test4'
    ]);
  });

  [
    { current: 0, next: 1, expected: [1, 0, 2, 3, 4] },
    { current: 0, next: 2, expected: [1, 2, 0, 3, 4] },
    { current: 0, next: 4, expected: [1, 2, 3, 4, 0] },
    { current: 4, next: 3, expected: [0, 1, 2, 4, 3] },
    { current: 4, next: 1, expected: [0, 4, 1, 2, 3] },
    { current: 4, next: 0, expected: [4, 0, 1, 2, 3] },
    { current: 2, next: 3, expected: [0, 1, 3, 2, 4] },
    { current: 3, next: 1, expected: [0, 3, 1, 2, 4] }
  ].forEach(({ current, next, expected }) => {
    it(`should be able update rank ${current} -> ${next}`, async () => {
      remotesService.addRemote('test3', 3, 'inmem');
      remotesService.addRemote('test2', 2, 'inmem');
      remotesService.addRemote('test0', 0, 'inmem');
      remotesService.addRemote('test4', 4, 'inmem');
      remotesService.addRemote('test1', 1, 'inmem');

      remotesService.updateRemoteRank(current, next);

      const { result } = renderHook(() => remotesService.useRemotes());
      expect(result.current).toHaveLength(5);
      expect(result.current.map(r => r.name)).toStrictEqual(
        expected.map(r => `test${r}`)
      );
    });
  });
});
