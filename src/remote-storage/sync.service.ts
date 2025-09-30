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
    const pushRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    console.log(`pushing to ${pushRemotes.length} active remote(s)`);
    const oldForceMode = remotesService.getForceMode();
    remotesService.setForceMode(force);
    for (const remote of pushRemotes) {
      const persister = remotesService.getPersister(remote.id);
      if (persister) {
        // TODO only primary, then use setTimeout for the others
        await persister.save();
      } else {
        console.warn('no persister found for remote', remote.id);
      }
    }
    remotesService.setForceMode(oldForceMode);
  }

  // only pull from primary by default
  public async pull(remoteId?: string, force = false) {
    if (!remoteId) {
      const remote = remotesService.getRemotes()[0];
      remoteId = remote?.id;
    }
    const oldForceMode = remotesService.getForceMode();
    remotesService.setForceMode(force);
    const persister = remotesService.getPersister(remoteId);
    if (persister) {
      await persister.load();
    }
    remotesService.setForceMode(oldForceMode);
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

  public useHasLocalConflicts() {
    return collectionService.useConflicts().length > 0;
  }
}

export const syncService = new SyncService();
