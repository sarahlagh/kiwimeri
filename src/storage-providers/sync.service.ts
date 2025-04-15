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
    const content = storageService.getSpace().getJson();
    const remotes = remotesService.getRemotes();
    const pushRemotes = remotes.filter(r =>
      remoteId ? r.id === remoteId && r.connected : r.connected
    );
    console.log(`pushing to ${pushRemotes.length} active remotes`);

    for (const remote of pushRemotes) {
      console.log(`pushing to remote ${remote.name} `);
      const provider = remotesService.getProvider(remote.id)!;
      const lastModified = await provider.push(content);
      storageService.getStore().transaction(() => {
        storageService.setLastLocalChange(lastModified);
        remotesService.setLastRemoteChange(
          remote.state,
          lastModified as number
        );
      });
    }
  }

  // only pull from primary by default
  public async pull(remoteId?: string) {
    let remote;
    if (!remoteId) {
      remote = remotesService.getRemotes()[0];
      remoteId = remote.id;
    } else {
      remote = remotesService.getRemotes().find(r => r.id === remoteId);
    }
    const provider = remotesService.getProvider(remoteId);
    if (remote && provider) {
      console.log(`pushing to remote ${remote.name}`);
      const resp = await provider.pull();
      if (resp && resp.content) {
        storageService.getSpace().setContent(resp.content);
        storageService.getStore().transaction(() => {
          storageService.setLastLocalChange(resp.lastRemoteChange!);
          remotesService.setLastRemoteChange(
            remote.state,
            resp.lastRemoteChange!
          );
        });
      }
    }
  }
  // public useCurrentHasLocalChanges() {
  //   const lastRemoteChange =
  //     (useCell(
  //       this.stateTable,
  //       'default-pcloud',
  //       'lastRemoteChange',
  //       storageService.getStore() as unknown as Store
  //     )?.valueOf() as number) || 0;
  //   const lastLocalChange = storageService.useLastLocalChange();
  //   return lastLocalChange > lastRemoteChange;
  // }
}

export const syncService = new SyncService();
