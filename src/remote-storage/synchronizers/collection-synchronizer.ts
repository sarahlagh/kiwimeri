import localChangesService from '@/db/local-changes.service';
import storageService from '@/db/storage.service';
import { RemoteResult, RemoteState } from '@/db/types/store-types';
import { CloudStorageFilesystem, RemoteInfo } from '../sync-types';

export class CollectionSynchronizer {
  constructor(protected filesystem: CloudStorageFilesystem) {
    //
  }

  public async pull(remote: RemoteResult, force = false) {
    const store = storageService.getSpace(remote.space);
    const localContent = store.getContent();
    const localChanges = localChangesService.getLocalChanges();
    const remoteState = this.getCachedRemoteStateInfo(remote.state);

    try {
      const resp = await this.filesystem.pull(
        { ...remote, ...remoteState },
        force
      );
      if (resp && resp.didPull) {
        this.updateRemoteInfo(
          remote.state,
          resp.remoteInfo,
          force || localChanges.length == 0,
          force || false
        );
        if (resp.remoteInfo.lastRemoteChange)
          localChangesService.setLastPulled(resp.remoteInfo.lastRemoteChange);
      }
    } catch (e) {
      console.error('error pulling', remote.name, this.filesystem.getName(), e);
      // restore
      storageService.getSpace().setContent(localContent);
      return false;
    }
    return true;
  }

  public async push(remote: RemoteResult, force = false) {
    const remoteState = this.getCachedRemoteStateInfo(remote.state);
    try {
      const resp = await this.filesystem.push(
        { ...remote, ...remoteState },
        force
      );
      this.updateRemoteInfo(remote.state, resp.remoteInfo, true, true);
      if (resp.remoteInfo.lastRemoteChange)
        localChangesService.setLastPulled(resp.remoteInfo.lastRemoteChange);
    } catch (e) {
      console.error('error pushing', remote.name, this.filesystem.getName(), e);
    }
  }

  private getCachedRemoteStateInfo(stateId: string) {
    const row = storageService.getStore().getRow('remoteState', stateId);
    return {
      ...row,
      id: stateId,
      info: row.info ? JSON.parse(row.info as string) : undefined
    } as RemoteState;
  }

  // TODO duplicate of remote service method
  private updateRemoteStateInfo(stateId: string, remoteInfo: RemoteState) {
    storageService.getStore().transaction(() => {
      storageService
        .getStore()
        .setCell(
          'remoteState',
          stateId,
          'lastRemoteChange',
          remoteInfo.lastRemoteChange || 0
        );
      if (remoteInfo.info) {
        storageService
          .getStore()
          .setCell(
            'remoteState',
            stateId,
            'info',
            JSON.stringify(remoteInfo.info)
          );
      }
    });
  }

  private updateRemoteInfo(
    state: string,
    remoteInfo: RemoteInfo,
    updateLocalChanges: boolean,
    clearLocalChanges: boolean
  ) {
    storageService.getStore().transaction(() => {
      if (updateLocalChanges) {
        localChangesService.setLastLocalChange(
          remoteInfo.lastRemoteChange || 0
        );
      }
      if (clearLocalChanges) {
        localChangesService.clear();
      }
      this.updateRemoteStateInfo(state, remoteInfo);
    });
  }
}
