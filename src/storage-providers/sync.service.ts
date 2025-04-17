import { remotesService } from '@/db/remotes.service';
import storageService from '@/db/storage.service';

export type SyncDirection = 'push' | 'pull';

class SyncService {
  public async sync(direction: SyncDirection, remote?: string) {
    if (direction === 'push') {
      return this.push(remote);
    }
    return this.pull(remote);
  }

  public async push(remoteId?: string) {
    const remotes = remotesService.getRemotes();
    const pushRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    console.log(`pushing to ${pushRemotes.length} active remotes`);
    for (const remote of pushRemotes) {
      const persister = remotesService.getPersister(remote.id);
      if (persister) {
        await persister.save();
      }
    }
  }

  // only pull from primary by default
  public async pull(remoteId?: string) {
    if (!remoteId) {
      const remote = remotesService.getRemotes()[0];
      remoteId = remote?.id;
    }
    const persister = remotesService.getPersister(remoteId);
    if (persister) {
      await persister.load();
    }
  }

  public usePrimaryConnected() {
    const primary = remotesService.usePrimaryRemote();
    if (!primary) {
      return false;
    }
    return primary.connected;
  }
  public usePrimaryHasLocalChanges() {
    const lastLocalChange = storageService.useLastLocalChange();
    const lastRemoteChange = remotesService.usePrimaryLastRemoteChange();
    return lastLocalChange > lastRemoteChange;
  }
}

export const syncService = new SyncService();
