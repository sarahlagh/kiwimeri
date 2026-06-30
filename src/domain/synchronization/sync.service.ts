import { networkService } from '@/core/infra/network.service';
import { deviceSettings } from '@/domain/device-settings/device-settings.service';
import fetchRemotesQuery from './queries/fetchRemotesQuery';
import replicaService from './replica.service';

export type SyncDirection = 'sync' | 'force-push' | 'force-pull';

class SyncService {
  public start() {
    if (deviceSettings.isSyncEnabled()) {
      networkService.onStatusUp(
        '[storage reinit]',
        () => {
          setTimeout(async () => {
            console.log(
              '[sync] network connected - will attempt to re init remotes'
            );
            await this.reinit();
          });
        },
        true
      );
    }
  }

  public stop() {
    replicaService.clearAll();
  }

  public async reinit(initAll = false) {
    const connectedRemotes = fetchRemotesQuery.getResults(
      {
        connected: initAll ? undefined : true
      },
      'rank'
    );

    if (connectedRemotes.length < 1) {
      console.log('[sync] no initial sync configuration');
      return;
    }

    for (const remote of connectedRemotes) {
      console.log(
        '[sync] found initial sync configurations',
        remote.name,
        remote.driver
      );
      const connected = await replicaService.ping(remote);
      console.debug(`remote ${remote.name} configured: ${connected}`);
    }
  }

  public async sync(
    direction: SyncDirection,
    remote?: string
  ): Promise<{ success: boolean; didPull?: boolean; didPush?: boolean }> {
    switch (direction) {
      case 'sync':
        return this.pullMerge(remote);
      case 'force-push':
        return this.push(remote, true);
      case 'force-pull':
        return this.pull(remote, true);
    }
  }

  private async pullMerge(remoteId?: string) {
    // merge only on primary & push force on others
    const remotes = fetchRemotesQuery.getResults({});
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const primary = activeRemotes[0];
      const resp = await replicaService.sync(primary.id);
      activeRemotes.shift();
      if (activeRemotes.length > 0) {
        setTimeout(async () => {
          for (const remote of activeRemotes) {
            await replicaService.push(remote.id, true);
          }
        });
      }
      return resp;
    }
    return { success: true, didPull: false, didPush: false };
  }

  // only push to primary or selected
  public async push(remoteId?: string, force = false) {
    const remotes = fetchRemotesQuery.getResults({});
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const remote = activeRemotes[0];
      return replicaService.push(remote.id, force);
    }
    return { success: true, didPush: false };
  }

  // only pull from primary or selected
  public async pull(remoteId?: string, force = false) {
    const remotes = fetchRemotesQuery.getResults({});
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const remote = activeRemotes[0];
      return replicaService.pull(remote.id, force);
    }
    return { success: true, didPull: false };
  }
}

export const syncService = new SyncService();
