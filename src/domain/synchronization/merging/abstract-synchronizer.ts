import { space } from '@/core/db/store';
import { SpaceTables } from '@/core/db/store-constants';
import { AnyData, WithId } from '@/core/db/types';
import { Remote } from '../configuration/model';
import {
  ReplicaState,
  ReplicaStateRow,
  StoredStateInfo
} from '../replica-state/model';

export type RemoteRepresentation = WithId<Partial<Remote>>;

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

  protected storeReplicaStateInfo<
    K extends keyof Omit<ReplicaStateRow, 'connected'>
  >(remoteId: string, remoteInfo: ReplicaState, key: K) {
    const storedState: StoredStateInfo = {
      lastPulled: remoteInfo.lastPulled,
      lastRemoteChange: remoteInfo.lastRemoteChange,
      driverInfo: remoteInfo.driverInfo
    };
    const row: Partial<Record<K, unknown>> = {};
    row[key] = storedState;
    space.setPartialRow(SpaceTables.ReplicaState, remoteId, row);
  }

  protected getLastPulled<K extends keyof Omit<ReplicaStateRow, 'connected'>>(
    remoteId: string,
    key: K
  ): number {
    const stateInfo = space.getCell(
      SpaceTables.ReplicaState,
      remoteId,
      key
    ) as ReplicaStateRow[K];
    return stateInfo?.lastPulled || 0;
  }
}
