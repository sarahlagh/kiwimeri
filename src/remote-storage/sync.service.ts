import platformService from '@/common/services/platform.service';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import remotesService from '@/db/remotes.service';

export type SyncDirection = 'sync' | 'force-push' | 'force-pull';

class SyncService {
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
    const remotes = remotesService.getRemotes();
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const primary = activeRemotes[0];
      const resp = await remotesService.sync(primary);
      activeRemotes.shift();
      if (activeRemotes.length > 0) {
        setTimeout(async () => {
          for (const remote of activeRemotes) {
            await remotesService.push(remote, true);
          }
        });
      }
      return resp;
    }
    return { success: true, didPull: false, didPush: false };
  }

  // only push to primary or selected
  public async push(remoteId?: string, force = false) {
    const remotes = remotesService.getRemotes();
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const remote = activeRemotes[0];
      return remotesService.push(remote, force);
    }
    return { success: true, didPush: false };
  }

  // only pull from primary or selected
  public async pull(remoteId?: string, force = false) {
    const remotes = remotesService.getRemotes();
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const remote = activeRemotes[0];
      return remotesService.pull(remote, force);
    }
    return { success: true, didPull: false };
  }

  public usePrimaryConnected() {
    const primary = remotesService.usePrimaryRemote();
    if (!primary || !platformService.isSyncEnabled()) {
      return false;
    }
    return primary.connected;
  }
  public usePrimaryHasLocalChanges() {
    return localChangesService.useHasLocalChanges();
  }

  public usePrimaryHasRemoteChanges() {
    const lastPulled = localChangesService.useLastPulled();
    const lastRemoteChange = remotesService.usePrimaryLastRemoteChange();
    return lastPulled < lastRemoteChange;
  }

  public useHasLocalConflicts() {
    return collectionService.useConflicts().length > 0;
  }

  public useIsMergeSyncEnabled() {
    const isConnected = this.usePrimaryConnected();
    const hasConflicts = this.useHasLocalConflicts();
    // const onlyForcePush = useStoreValueWithDefault('onlyForcePush', false);
    return isConnected && !hasConflicts; // && !onlyForcePush;
  }
}

export const syncService = new SyncService();
