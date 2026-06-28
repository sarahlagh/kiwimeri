import { useQueryResults } from '@/core/db/queries-helper';
import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import remotesService from '@/domain/remotes/configuration/remotes.service';
import fetchRemotesQuery from '@/domain/replication/replica-state/queries/fetchRemotesQuery';
import replicaService from '@/domain/replication/replica-state/replica.service';
import { syncService } from '@/domain/replication/sync.service';
import { wrappedRenderHook } from '@@/_setup/test.utils';
import { describe, expect, it } from 'vitest';

describe('remotes service', () => {
  it('should add a remote in db without testing connection', () => {
    remotesService.addRemote('test', 0, 'inmem');
    expect(space.getRowCount(SpaceTables.Remote)).toBe(1);
    const rowId = space.getRowIds(SpaceTables.Remote)[0];
    const row = space.getRow(SpaceTables.Remote, rowId);
    expect(row.name).toBe('test');
    expect(row.rank).toBe(0);
    expect(row.driver).toBe('inmem');
    expect(space.hasRow(SpaceTables.ReplicaState, rowId)).toBeFalsy();
  });

  it('should not init sync for previously unconfigured remotes', async () => {
    remotesService.addRemote('test', 0, 'inmem');
    await syncService.reinit();
    const rowId = space.getRowIds(SpaceTables.Remote)[0];
    const stateRow = space.getRow(SpaceTables.ReplicaState, rowId);
    expect(stateRow.connected).toBeFalsy();
    expect(replicaService['synchronizers'].get(rowId)).toBeUndefined();
  });

  it('should only init sync for previously configured remotes', async () => {
    remotesService.addRemote('test', 0, 'inmem');
    const rowId = space.getRowIds(SpaceTables.Remote)[0];
    const ok = await replicaService.ping({
      id: rowId,
      driver: 'pcloud',
      config: {},
      connected: false,
      name: 'test',
      rank: 0
    });
    expect(ok).toBeTruthy();
    expect(replicaService['synchronizers'].get(rowId)).toBeDefined();
    await syncService.reinit();
    const stateRow = space.getRow(SpaceTables.ReplicaState, rowId);
    expect(stateRow.connected).toBeTruthy();
    expect(replicaService['synchronizers'].get(rowId)).toBeDefined();
  });

  it('should only init sync for all remotes on demand', async () => {
    remotesService.addRemote('test', 0, 'inmem');
    await syncService.reinit(true);
    const rowId = space.getRowIds(SpaceTables.Remote)[0];
    const stateRow = space.getRow(SpaceTables.ReplicaState, rowId);
    expect(stateRow.connected).toBeTruthy();
    expect(replicaService['synchronizers'].get(rowId)).toBeDefined();
  });

  it('should sort remotes by rank', async () => {
    fetchRemotesQuery.initQuery();
    remotesService.addRemote('test3', 3, 'inmem');
    remotesService.addRemote('test2', 2, 'inmem');
    remotesService.addRemote('test0', 0, 'inmem');
    remotesService.addRemote('test4', 4, 'inmem');
    remotesService.addRemote('test1', 1, 'inmem');

    const { result } = wrappedRenderHook(() =>
      useQueryResults(fetchRemotesQuery)
    );
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

  describe('update rank', () => {
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
      it(`${current} -> ${next}`, async () => {
        fetchRemotesQuery.initQuery();
        remotesService.addRemote('test3', 3, 'inmem');
        remotesService.addRemote('test2', 2, 'inmem');
        remotesService.addRemote('test0', 0, 'inmem');
        remotesService.addRemote('test4', 4, 'inmem');
        remotesService.addRemote('test1', 1, 'inmem');

        remotesService.updateRemoteRank(current, next);

        const { result } = wrappedRenderHook(() =>
          useQueryResults(fetchRemotesQuery)
        );
        expect(result.current).toHaveLength(5);
        expect(result.current.map(r => r.name)).toStrictEqual(
          expected.map(r => `test${r}`)
        );
      });
    });
  });
});
