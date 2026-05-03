import storageService from '@/db/storage.service';
import { AnyData, RemoteResult, RemoteState } from '@/db/types/store-types';

export type RemoteRepresentation = Required<Pick<RemoteResult, 'id' | 'name'>>;

export abstract class CloudStorageSynchronizer {
  public abstract configure(
    conf?: AnyData,
    proxy?: string,
    useHttp?: boolean
  ): void;

  public abstract connect(): Promise<{
    connected: boolean;
    config?: AnyData | null;
  }>;

  public async sync(): Promise<{
    didPull: boolean;
    didPush: boolean;
    success: boolean;
  }> {
    const { success: pullSuccess, didPull } = await this.pull();
    if (pullSuccess) {
      const { success, didPush } = await this.push();
      return { success, didPull, didPush };
    }
    return { success: false, didPull, didPush: false };
  }

  public abstract push(
    force?: boolean
  ): Promise<{ didPush: boolean; success: boolean }>;

  public abstract pull(
    force?: boolean
  ): Promise<{ didPull: boolean; success: boolean }>;

  public abstract destroy(): Promise<void>;

  protected getLastPulled(remoteStateId: string): number {
    return (
      (storageService
        .getStore()
        .getCell('remoteState', remoteStateId, 'lastPulled')
        ?.valueOf() as number) || 0
    );
  }

  protected updateRemoteStateInfo(stateId: string, remoteInfo: RemoteState) {
    storageService.getStore().transaction(() => {
      storageService
        .getStore()
        .setCell(
          'remoteState',
          stateId,
          'lastRemoteChange',
          remoteInfo.lastRemoteChange || 0
        );
      if (remoteInfo.lastPulled) {
        storageService
          .getStore()
          .setCell('remoteState', stateId, 'lastPulled', remoteInfo.lastPulled);
      }
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
}
