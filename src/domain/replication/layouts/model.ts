import { RemoteState } from '@/db/types/store-types';

export type UpdatedRemoteState = {
  lastPulled: number;
} & RemoteState;
