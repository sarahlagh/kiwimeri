import platformService from '@/common/services/platform.service';
import collectionService from '@/db/collection.service';
import localChangesService from '@/db/local-changes.service';
import remotesService from '@/db/remotes.service';

export type SyncDirection =
  | 'sync'
  | 'push'
  | 'pull'
  | 'force-push'
  | 'force-pull';

class SyncService {
  public async sync(direction: SyncDirection, remote?: string) {
    switch (direction) {
      case 'sync':
        await this.pull(remote);
        if (
          localChangesService.getLocalChanges().length > 0 &&
          collectionService.getConflicts().length === 0
        ) {
          return this.push(remote);
        }
        return;
      case 'push':
        return this.push(remote);
      case 'pull':
        return this.pull(remote);
      case 'force-push':
        return this.push(remote, true);
      case 'force-pull':
        return this.pull(remote, true);
    }
  }

  public async push(remoteId?: string, force = false) {
    const remotes = remotesService.getRemotes();
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    console.log(`pushing to ${activeRemotes.length} active remote(s)`);
    // TODO only primary, then use setTimeout for the others
    for (const remote of activeRemotes) {
      await remotesService.push(remote, force);
    }
  }

  // only pull from primary by default
  public async pull(remoteId?: string, force = false) {
    const remotes = remotesService.getRemotes();
    const activeRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    if (activeRemotes.length > 0) {
      const remote = activeRemotes[0];
      await remotesService.pull(remote, force);
    }
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
}

export const syncService = new SyncService();
