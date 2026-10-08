import { DriverFileInfo } from '@/domain/synchronization/drivers/types';
import { Remote } from '@/domain/synchronization/remotes';
import { CellSchema } from 'tinybase/with-schemas';

export type StoredStateInfo = Partial<{
  lastPulled: number;
  lastRemoteChange: number;
  driverInfo: DriverFileInfo[];
}>;

export type ReplicaStateRow = {
  connected: boolean;
  collectionInfo?: StoredStateInfo;
  statsInfo?: StoredStateInfo;
};

export const replicaStatesSchema = {
  connected: { type: 'boolean', default: false },
  collectionInfo: { type: 'object' },
  statsInfo: { type: 'object' }
} as const satisfies Record<keyof ReplicaStateRow, CellSchema>;

type ReplicaStateCommon = Pick<ReplicaStateRow, 'connected'>;
export type ConnectedRemote = Remote & ReplicaStateCommon;

export type ReplicaState = ReplicaStateCommon & StoredStateInfo;
export type ReplicaRemoteState = ReplicaStateCommon &
  Omit<StoredStateInfo, 'lastPulled'>;
